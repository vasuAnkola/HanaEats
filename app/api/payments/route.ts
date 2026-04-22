import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import pool from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const outlet_id = searchParams.get("outlet_id");
  const shift_id = searchParams.get("shift_id");
  const status = searchParams.get("status");

  if (!outlet_id) return NextResponse.json({ error: "outlet_id required" }, { status: 400 });

  let sql = `
    SELECT p.*, o.order_number, u.name as created_by_name,
      json_agg(json_build_object('method', ps.method, 'amount', ps.amount, 'reference', ps.reference) ORDER BY ps.id) as splits
    FROM payments p
    JOIN orders o ON o.id = p.order_id
    LEFT JOIN users u ON u.id = p.created_by
    LEFT JOIN payment_splits ps ON ps.payment_id = p.id
    WHERE p.outlet_id = $1 AND p.tenant_id = $2
  `;
  const params: unknown[] = [outlet_id, session.user.tenantId];

  if (shift_id) { params.push(shift_id); sql += ` AND p.shift_id = $${params.length}`; }
  if (status)   { params.push(status);   sql += ` AND p.status = $${params.length}`; }

  sql += ` GROUP BY p.id, o.order_number, u.name ORDER BY p.created_at DESC LIMIT 100`;

  const rows = await query(sql, params);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { order_id, outlet_id, shift_id, splits, amount_paid, discount_amount = 0 } = body;

  if (!order_id || !outlet_id || !splits?.length) {
    return NextResponse.json({ error: "order_id, outlet_id and splits required" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Get order total
    const order = await client.query(
      `SELECT total, tax_amount, status FROM orders WHERE id=$1 AND tenant_id=$2`,
      [order_id, session.user.tenantId]
    );
    if (!order.rows[0]) throw new Error("Order not found");
    if (order.rows[0].status === "cancelled") throw new Error("Cannot pay cancelled order");

    const totalAmount = parseFloat(order.rows[0].total);
    const taxAmount   = parseFloat(order.rows[0].tax_amount);
    const totalPaid   = splits.reduce((s: number, sp: { amount: number }) => s + Number(sp.amount), 0);
    const changeGiven = Math.max(0, totalPaid - (totalAmount - discount_amount));

    const paymentNumber = `PAY-${Date.now().toString().slice(-8)}`;

    const payRes = await client.query(
      `INSERT INTO payments (order_id, outlet_id, tenant_id, shift_id, payment_number, total_amount, tax_amount, discount_amount, amount_paid, change_given, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [order_id, outlet_id, session.user.tenantId, shift_id || null, paymentNumber,
       totalAmount, taxAmount, discount_amount, totalPaid, changeGiven, session.user.id]
    );
    const payment = payRes.rows[0];

    for (const sp of splits) {
      await client.query(
        `INSERT INTO payment_splits (payment_id, method, amount, reference) VALUES ($1,$2,$3,$4)`,
        [payment.id, sp.method, sp.amount, sp.reference || null]
      );
    }

    // Close order and free table if dine-in
    const orderInfo = await client.query(`UPDATE orders SET status='closed' WHERE id=$1 RETURNING table_id`, [order_id]);
    const tableId = orderInfo.rows[0]?.table_id;
    if (tableId) {
      await client.query(`UPDATE outlet_tables SET status='available' WHERE id=$1`, [tableId]);
    }

    await client.query("COMMIT");
    return NextResponse.json(payment, { status: 201 });
  } catch (e: unknown) {
    await client.query("ROLLBACK");
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  } finally {
    client.release();
  }
}
