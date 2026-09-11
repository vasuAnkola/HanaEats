import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import pool from "@/lib/db";
import { auth } from "@/lib/auth";
import { businessDateStr } from "@/lib/date";
import { getTenantTimezone } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !["super_admin", "admin", "manager", "cashier"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

function computeDiscount(discountType: string, discountValue: number, subtotal: number): number {
  const raw = discountType === "percentage" ? (subtotal * discountValue) / 100 : discountValue;
  return parseFloat(Math.min(Math.max(raw, 0), subtotal).toFixed(2));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !["super_admin", "admin", "manager", "cashier"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { order_id, outlet_id, shift_id, splits, voucher_id, promotion_id } = body;

  if (!order_id || !outlet_id || !splits?.length) {
    return NextResponse.json({ error: "order_id, outlet_id and splits required" }, { status: 400 });
  }
  if (voucher_id && promotion_id) {
    return NextResponse.json({ error: "Apply only one discount at a time" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const order = await client.query(
      `SELECT total, tax_amount, status, customer_id FROM orders WHERE id=$1 AND tenant_id=$2`,
      [order_id, session.user.tenantId]
    );
    if (!order.rows[0]) throw new Error("Order not found");
    if (order.rows[0].status === "cancelled") throw new Error("Cannot pay cancelled order");
    const customerId = order.rows[0].customer_id;

    const totalAmount = parseFloat(order.rows[0].total);
    const taxAmount = parseFloat(order.rows[0].tax_amount);

    // The discount is never trusted from the client — it's recomputed here from a
    // real, still-valid voucher/promotion row, so a tampered request can't just
    // declare an arbitrary discount_amount.
    let discountAmount = 0;
    let voucherToIncrement: number | null = null;
    const today = businessDateStr(await getTenantTimezone(session.user.tenantId));

    if (voucher_id) {
      const v = await client.query(
        `SELECT * FROM vouchers WHERE id=$1 AND tenant_id=$2 AND is_active=TRUE
           AND (valid_from IS NULL OR valid_from <= $3) AND (valid_until IS NULL OR valid_until >= $3)`,
        [voucher_id, session.user.tenantId, today]
      );
      const voucher = v.rows[0];
      if (!voucher) throw new Error("Voucher is invalid or no longer active");
      if (totalAmount < parseFloat(voucher.min_order_amount)) {
        throw new Error(`Minimum order amount for this voucher is ${parseFloat(voucher.min_order_amount).toFixed(2)}`);
      }
      if (voucher.max_uses != null && voucher.used_count >= voucher.max_uses) {
        throw new Error("Voucher usage limit reached");
      }
      discountAmount = computeDiscount(voucher.discount_type, parseFloat(voucher.discount_value), totalAmount);
      voucherToIncrement = voucher.id;
    } else if (promotion_id) {
      const p = await client.query(
        `SELECT * FROM promotions WHERE id=$1 AND tenant_id=$2 AND is_active=TRUE AND start_date<=$3 AND end_date>=$3`,
        [promotion_id, session.user.tenantId, today]
      );
      const promo = p.rows[0];
      if (!promo) throw new Error("Promotion is invalid or no longer active");
      discountAmount = computeDiscount(promo.discount_type, parseFloat(promo.discount_value), totalAmount);
    }

    const totalPaid = splits.reduce((s: number, sp: { amount: number }) => s + Number(sp.amount), 0);
    const changeGiven = Math.max(0, totalPaid - (totalAmount - discountAmount));

    const paymentNumber = `PAY-${Date.now().toString().slice(-8)}`;

    const payRes = await client.query(
      `INSERT INTO payments (order_id, outlet_id, tenant_id, shift_id, payment_number, total_amount, tax_amount, discount_amount, amount_paid, change_given, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [order_id, outlet_id, session.user.tenantId, shift_id || null, paymentNumber,
       totalAmount, taxAmount, discountAmount, totalPaid, changeGiven, session.user.id]
    );
    const payment = payRes.rows[0];

    for (const sp of splits) {
      await client.query(
        `INSERT INTO payment_splits (payment_id, method, amount, reference) VALUES ($1,$2,$3,$4)`,
        [payment.id, sp.method, sp.amount, sp.reference || null]
      );
    }

    if (voucherToIncrement) {
      await client.query(`UPDATE vouchers SET used_count = used_count + 1 WHERE id = $1`, [voucherToIncrement]);
    }

    // Earn loyalty points on the customer attached to this order (1 point per
    // whole currency unit actually paid), and track their spend/visit history.
    if (customerId) {
      const earned = Math.floor(totalPaid);
      const custRes = await client.query(
        `UPDATE customers SET
           loyalty_points = loyalty_points + $1,
           total_spent = total_spent + $2,
           visit_count = visit_count + 1
         WHERE id = $3 AND tenant_id = $4
         RETURNING loyalty_points`,
        [earned, totalPaid, customerId, session.user.tenantId]
      );
      if (custRes.rows[0] && earned > 0) {
        await client.query(
          `INSERT INTO loyalty_transactions (tenant_id, customer_id, payment_id, type, points, balance_after, notes, created_by)
           VALUES ($1,$2,$3,'earn',$4,$5,$6,$7)`,
          [session.user.tenantId, customerId, payment.id, earned, custRes.rows[0].loyalty_points, `Earned from payment ${paymentNumber}`, session.user.id]
        );
      }
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
