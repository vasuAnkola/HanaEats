import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import pool from "@/lib/db";
import { z } from "zod";

const numStr = z.union([z.number(), z.string()]).transform(v => parseFloat(String(v)));

const ItemSchema = z.object({
  item_id: z.union([z.number(), z.string()]).transform(v => parseInt(String(v))).nullable().optional(),
  item_name: z.string().min(1),
  quantity: z.union([z.number(), z.string()]).transform(v => parseInt(String(v))),
  unit_price: numStr,
  note: z.string().optional(),
  variants: z.array(z.object({
    variant_name: z.string(),
    option_name: z.string(),
    price_modifier: numStr.default(0),
  })).optional(),
  addons: z.array(z.object({
    addon_name: z.string(),
    price: numStr.default(0),
  })).optional(),
});

const Schema = z.object({
  outlet_id: z.union([z.number(), z.string()]).transform(v => parseInt(String(v))),
  table_id: z.union([z.number(), z.string()]).transform(v => parseInt(String(v))).nullable().optional(),
  order_type: z.enum(["dine_in", "takeaway", "delivery", "drive_thru"]).default("dine_in"),
  customer_name: z.string().optional(),
  customer_note: z.string().optional(),
  tax_rate: numStr.default(0),
  items: z.array(ItemSchema).min(1),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const outletId = searchParams.get("outlet_id");
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") ?? "50");

  if (!outletId) return NextResponse.json({ error: "outlet_id required" }, { status: 400 });

  const orders = await query(
    `SELECT o.*, t.table_number, u.name as served_by_name
     FROM orders o
     LEFT JOIN outlet_tables t ON t.id = o.table_id
     LEFT JOIN users u ON u.id = o.served_by
     WHERE o.outlet_id = $1
     ${status ? "AND o.status = $2" : ""}
     ORDER BY o.created_at DESC
     LIMIT ${limit}`,
    status ? [outletId, status] : [outletId]
  );
  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !["super_admin", "admin", "manager", "cashier", "waiter"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid input" }, { status: 400 });
  }

  const { outlet_id, table_id, order_type, customer_name, customer_note, tax_rate, items } = parsed.data;
  const tenantId = session.user.tenantId ?? body.tenant_id;

  // Calculate totals
  let subtotal = 0;
  for (const item of items) {
    const variantTotal = (item.variants ?? []).reduce((s, v) => s + v.price_modifier, 0);
    const addonTotal = (item.addons ?? []).reduce((s, a) => s + a.price, 0);
    subtotal += (item.unit_price + variantTotal + addonTotal) * item.quantity;
  }
  const taxAmount = parseFloat(((subtotal * tax_rate) / 100).toFixed(2));
  const total = parseFloat((subtotal + taxAmount).toFixed(2));
  subtotal = parseFloat(subtotal.toFixed(2));

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orderNum = `ORD-${Date.now().toString().slice(-6)}`;
    const orderRes = await client.query(
      `INSERT INTO orders (outlet_id, tenant_id, table_id, order_type, status, order_number, customer_name, customer_note, subtotal, tax_amount, total, served_by)
       VALUES ($1,$2,$3,$4,'pending',$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [outlet_id, tenantId, table_id ?? null, order_type, orderNum, customer_name ?? null, customer_note ?? null, subtotal, taxAmount, total, session.user.id]
    );
    const order = orderRes.rows[0];

    for (const item of items) {
      const variantTotal = (item.variants ?? []).reduce((s, v) => s + v.price_modifier, 0);
      const addonTotal = (item.addons ?? []).reduce((s, a) => s + a.price, 0);
      const lineTotal = parseFloat(((item.unit_price + variantTotal + addonTotal) * item.quantity).toFixed(2));

      const itemRes = await client.query(
        `INSERT INTO order_items (order_id, item_id, item_name, quantity, unit_price, total_price, note)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [order.id, item.item_id ?? null, item.item_name, item.quantity, item.unit_price, lineTotal, item.note ?? null]
      );
      const orderItemId = itemRes.rows[0].id;

      for (const v of (item.variants ?? [])) {
        await client.query(
          `INSERT INTO order_item_variants (order_item_id, variant_name, option_name, price_modifier) VALUES ($1,$2,$3,$4)`,
          [orderItemId, v.variant_name, v.option_name, v.price_modifier]
        );
      }
      for (const a of (item.addons ?? [])) {
        await client.query(
          `INSERT INTO order_item_addons (order_item_id, addon_name, price) VALUES ($1,$2,$3)`,
          [orderItemId, a.addon_name, a.price]
        );
      }
    }

    // Mark table occupied if dine-in
    if (table_id && order_type === "dine_in") {
      await client.query("UPDATE outlet_tables SET status = 'occupied' WHERE id = $1", [table_id]);
    }

    await client.query("COMMIT");
    return NextResponse.json(order, { status: 201 });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[orders] transaction failed:", err);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  } finally {
    client.release();
  }
}
