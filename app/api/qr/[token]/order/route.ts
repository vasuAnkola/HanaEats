import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import pool from "@/lib/db";

interface QrSession {
  tenant_id: number;
  outlet_id: number;
  table_id: number;
}

interface OrderItem {
  item_id?: number;
  item_name: string;
  quantity: number;
  unit_price: number;
  variants?: { variant_name: string; option_name: string; price_modifier: number }[];
  addons?: { addon_name: string; price: number }[];
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const qrSession = await queryOne<QrSession>(
    "SELECT tenant_id, outlet_id, table_id FROM qr_sessions WHERE token = $1 AND is_active = true AND expires_at > NOW()",
    [token]
  );

  if (!qrSession) {
    return NextResponse.json({ error: "Invalid or expired QR code" }, { status: 403 });
  }

  const body = await req.json();
  const { customer_name, items } = body as { customer_name: string; items: OrderItem[] };

  if (!items || items.length === 0) {
    return NextResponse.json({ error: "No items provided" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const subtotal = items.reduce((sum, item) => {
      const itemTotal = parseFloat(String(item.unit_price)) * item.quantity;
      const variantsTotal = (item.variants ?? []).reduce((s, v) => s + parseFloat(String(v.price_modifier)), 0) * item.quantity;
      const addonsTotal = (item.addons ?? []).reduce((s, a) => s + parseFloat(String(a.price)), 0) * item.quantity;
      return sum + itemTotal + variantsTotal + addonsTotal;
    }, 0);

    const orderNumber = "ORD-" + Date.now().toString(36).toUpperCase();

    const orderRow = await client.query(
      `INSERT INTO orders (tenant_id, outlet_id, table_id, order_type, status, order_number, customer_name, subtotal, tax_amount, total)
       VALUES ($1,$2,$3,'dine_in','pending',$4,$5,$6,0,$6) RETURNING id, order_number, status`,
      [qrSession.tenant_id, qrSession.outlet_id, qrSession.table_id, orderNumber, customer_name || null, subtotal.toFixed(2)]
    );

    const order = orderRow.rows[0] as { id: number; order_number: string; status: string };

    for (const item of items) {
      const unitPrice = parseFloat(String(item.unit_price));
      const variantsTotal = (item.variants ?? []).reduce((s, v) => s + parseFloat(String(v.price_modifier)), 0);
      const addonsTotal = (item.addons ?? []).reduce((s, a) => s + parseFloat(String(a.price)), 0);
      const lineTotal = (unitPrice + variantsTotal + addonsTotal) * item.quantity;

      const itemRow = await client.query(
        `INSERT INTO order_items (order_id, item_id, item_name, quantity, unit_price, total_price)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [order.id, item.item_id || null, item.item_name, item.quantity, unitPrice.toFixed(2), lineTotal.toFixed(2)]
      );
      const orderItemId = (itemRow.rows[0] as { id: number }).id;

      for (const v of item.variants ?? []) {
        await client.query(
          "INSERT INTO order_item_variants (order_item_id, variant_name, option_name, price_modifier) VALUES ($1,$2,$3,$4)",
          [orderItemId, v.variant_name, v.option_name, parseFloat(String(v.price_modifier)).toFixed(2)]
        );
      }

      for (const a of item.addons ?? []) {
        await client.query(
          "INSERT INTO order_item_addons (order_item_id, addon_name, price) VALUES ($1,$2,$3)",
          [orderItemId, a.addon_name, parseFloat(String(a.price)).toFixed(2)]
        );
      }
    }

    await client.query("COMMIT");

    return NextResponse.json({
      order_id: order.id,
      order_number: order.order_number,
      status: order.status,
      items_count: items.length,
    }, { status: 201 });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("QR order error:", err);
    return NextResponse.json({ error: "Failed to place order" }, { status: 500 });
  } finally {
    client.release();
  }
}
