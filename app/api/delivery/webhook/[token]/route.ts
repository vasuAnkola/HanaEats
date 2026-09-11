import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import pool from "@/lib/db";
import { z } from "zod";

// Public endpoint — called by delivery platforms (GrabFood, Foodpanda, GoFood), not by a logged-in user.
// Authenticated via the per-outlet webhook token embedded in the URL, not a session.

const ItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.union([z.number(), z.string()]).transform(v => parseInt(String(v))).default(1),
  unit_price: z.union([z.number(), z.string()]).transform(v => parseFloat(String(v))),
});

const Schema = z.object({
  external_order_id: z.string().min(1),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  delivery_address: z.string().optional(),
  items: z.array(ItemSchema).min(1),
});

interface PlatformRow {
  id: number; tenant_id: number; outlet_id: number; platform: string; is_active: boolean;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const platform = await queryOne<PlatformRow>(
    `SELECT id, tenant_id, outlet_id, platform, is_active FROM delivery_platforms WHERE webhook_token = $1`,
    [token]
  );
  if (!platform) return NextResponse.json({ error: "Invalid webhook token" }, { status: 404 });
  if (!platform.is_active) return NextResponse.json({ error: "Platform integration is disabled" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid payload" }, { status: 400 });
  }
  const { external_order_id, customer_name, customer_phone, delivery_address, items } = parsed.data;

  const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const total = parseFloat(subtotal.toFixed(2));

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orderNum = `${platform.platform.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;
    const orderRes = await client.query(
      `INSERT INTO orders (outlet_id, tenant_id, order_type, status, order_number, customer_name, subtotal, total)
       VALUES ($1,$2,'delivery','pending',$3,$4,$5,$5) RETURNING *`,
      [platform.outlet_id, platform.tenant_id, orderNum, customer_name ?? null, total]
    );
    const order = orderRes.rows[0];

    for (const item of items) {
      const lineTotal = parseFloat((item.unit_price * item.quantity).toFixed(2));
      await client.query(
        `INSERT INTO order_items (order_id, item_name, quantity, unit_price, total_price)
         VALUES ($1,$2,$3,$4,$5)`,
        [order.id, item.name, item.quantity, item.unit_price, lineTotal]
      );
    }

    const deliveryOrderRes = await client.query(
      `INSERT INTO delivery_orders (order_id, platform_id, tenant_id, external_order_id, customer_name, customer_phone, delivery_address, raw_payload)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [order.id, platform.id, platform.tenant_id, external_order_id, customer_name ?? null, customer_phone ?? null, delivery_address ?? null, JSON.stringify(body)]
    );

    await client.query("COMMIT");
    return NextResponse.json({ order_id: order.id, order_number: order.order_number, delivery_order: deliveryOrderRes.rows[0] }, { status: 201 });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[delivery-webhook] transaction failed:", err);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  } finally {
    client.release();
  }
}
