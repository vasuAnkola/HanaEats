import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import pool from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const order = await queryOne(
    `SELECT o.*, t.table_number, u.name as served_by_name
     FROM orders o
     LEFT JOIN outlet_tables t ON t.id = o.table_id
     LEFT JOIN users u ON u.id = o.served_by
     WHERE o.id = $1`,
    [id]
  );
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const items = await query(
    `SELECT oi.*,
       json_agg(DISTINCT oiv.*) FILTER (WHERE oiv.id IS NOT NULL) as variants,
       json_agg(DISTINCT oia.*) FILTER (WHERE oia.id IS NOT NULL) as addons
     FROM order_items oi
     LEFT JOIN order_item_variants oiv ON oiv.order_item_id = oi.id
     LEFT JOIN order_item_addons oia ON oia.order_item_id = oi.id
     WHERE oi.order_id = $1
     GROUP BY oi.id
     ORDER BY oi.created_at`,
    [id]
  );

  return NextResponse.json({ ...order, items });
}

// PATCH: add items to an existing order, or remove an order_item, or update qty
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { action } = body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orderRes = await client.query(
      `SELECT * FROM orders WHERE id=$1`, [id]
    );
    const order = orderRes.rows[0];
    if (!order) throw new Error("Order not found");
    if (["closed","cancelled"].includes(order.status)) throw new Error("Cannot edit a closed or cancelled order");

    if (action === "add_items") {
      const { items } = body as {
        items: { item_id: number | null; item_name: string; quantity: number; unit_price: number; note?: string;
          variants: { variant_name: string; option_name: string; price_modifier: number }[];
          addons: { addon_name: string; price: number }[] }[]
      };

      for (const item of items) {
        const unitPrice = parseFloat(String(item.unit_price)) || 0;
        const variantTotal = (item.variants ?? []).reduce((s, v) => s + (parseFloat(String(v.price_modifier)) || 0), 0);
        const addonTotal = (item.addons ?? []).reduce((s, a) => s + (parseFloat(String(a.price)) || 0), 0);
        const qty = parseInt(String(item.quantity)) || 1;
        const lineTotal = parseFloat(((unitPrice + variantTotal + addonTotal) * qty).toFixed(2));

        const itemRes = await client.query(
          `INSERT INTO order_items (order_id, item_id, item_name, quantity, unit_price, total_price, note)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
          [id, item.item_id ?? null, item.item_name, qty, unitPrice, lineTotal, item.note ?? null]
        );
        const orderItemId = itemRes.rows[0].id;

        for (const v of (item.variants ?? [])) {
          await client.query(
            `INSERT INTO order_item_variants (order_item_id, variant_name, option_name, price_modifier) VALUES ($1,$2,$3,$4)`,
            [orderItemId, v.variant_name, v.option_name, parseFloat(String(v.price_modifier)) || 0]
          );
        }
        for (const a of (item.addons ?? [])) {
          await client.query(
            `INSERT INTO order_item_addons (order_item_id, addon_name, price) VALUES ($1,$2,$3)`,
            [orderItemId, a.addon_name, parseFloat(String(a.price)) || 0]
          );
        }
      }
    } else if (action === "remove_item") {
      const { order_item_id } = body;
      await client.query(`DELETE FROM order_items WHERE id=$1 AND order_id=$2`, [order_item_id, id]);
    } else if (action === "update_qty") {
      const { order_item_id, quantity } = body;
      const qty = parseInt(String(quantity)) || 1;
      // Recalc line total
      const oi = await client.query(`SELECT * FROM order_items WHERE id=$1 AND order_id=$2`, [order_item_id, id]);
      if (oi.rows[0]) {
        const row = oi.rows[0];
        const varRes = await client.query(`SELECT SUM(price_modifier) as vt FROM order_item_variants WHERE order_item_id=$1`, [order_item_id]);
        const addonRes = await client.query(`SELECT SUM(price) as at FROM order_item_addons WHERE order_item_id=$1`, [order_item_id]);
        const vt = parseFloat(varRes.rows[0]?.vt ?? "0") || 0;
        const at = parseFloat(addonRes.rows[0]?.at ?? "0") || 0;
        const lineTotal = parseFloat(((parseFloat(row.unit_price) + vt + at) * qty).toFixed(2));
        await client.query(`UPDATE order_items SET quantity=$1, total_price=$2 WHERE id=$3`, [qty, lineTotal, order_item_id]);
      }
    } else {
      throw new Error("Unknown action");
    }

    // Recalculate order totals from order_items
    const totalsRes = await client.query(
      `SELECT COALESCE(SUM(total_price),0) as subtotal FROM order_items WHERE order_id=$1`, [id]
    );
    const subtotal = parseFloat(totalsRes.rows[0].subtotal);
    const taxRate = parseFloat(order.tax_rate ?? "0") || 0;
    const taxAmount = parseFloat(((subtotal * taxRate) / 100).toFixed(2));
    const total = parseFloat((subtotal + taxAmount).toFixed(2));

    const updated = await client.query(
      `UPDATE orders SET subtotal=$1, tax_amount=$2, total=$3, updated_at=NOW() WHERE id=$4 RETURNING *`,
      [subtotal.toFixed(2), taxAmount.toFixed(2), total.toFixed(2), id]
    );

    await client.query("COMMIT");
    return NextResponse.json(updated.rows[0]);
  } catch (e: unknown) {
    await client.query("ROLLBACK");
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  } finally {
    client.release();
  }
}
