import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const row = await queryOne(
    `SELECT p.*, o.order_number, o.order_type, o.table_number, o.customer_name, u.name as created_by_name,
      json_agg(json_build_object('method',ps.method,'amount',ps.amount,'reference',ps.reference) ORDER BY ps.id) FILTER (WHERE ps.id IS NOT NULL) as splits
     FROM payments p
     JOIN orders o ON o.id = p.order_id
     LEFT JOIN users u ON u.id = p.created_by
     LEFT JOIN payment_splits ps ON ps.payment_id = p.id
     WHERE p.id=$1 AND p.tenant_id=$2
     GROUP BY p.id, o.order_number, o.order_type, o.table_number, o.customer_name, u.name`,
    [id, session.user.tenantId]
  );
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { action, void_reason } = body;

  if (action !== "void") return NextResponse.json({ error: "Only void action supported" }, { status: 400 });

  const row = await queryOne(
    `UPDATE payments SET status='voided', void_reason=$1, voided_at=NOW(), voided_by=$2
     WHERE id=$3 AND tenant_id=$4 AND status='completed' RETURNING *`,
    [void_reason || null, session.user.id, id, session.user.tenantId]
  );
  if (!row) return NextResponse.json({ error: "Payment not found or not voidable" }, { status: 404 });

  // Reopen order and re-occupy table if dine-in
  const payment = row as { order_id: number };
  const orderRow = await queryOne<{ table_id: number | null }>(
    `UPDATE orders SET status='served' WHERE id=$1 RETURNING table_id`, [payment.order_id]
  );
  if (orderRow?.table_id) {
    await queryOne(`UPDATE outlet_tables SET status='occupied' WHERE id=$1`, [orderRow.table_id]);
  }

  return NextResponse.json(row);
}
