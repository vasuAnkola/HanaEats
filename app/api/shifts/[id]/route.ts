import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const row = await queryOne(
    `SELECT ss.*, u.name as cashier_name,
      (SELECT COALESCE(SUM(ps.amount),0) FROM payment_splits ps JOIN payments p ON p.id=ps.payment_id WHERE p.shift_id=ss.id AND p.status='completed' AND ps.method='cash') as cash_collected,
      (SELECT COALESCE(SUM(p.total_amount),0) FROM payments p WHERE p.shift_id=ss.id AND p.status='completed') as total_sales,
      (SELECT COUNT(*) FROM payments p WHERE p.shift_id=ss.id AND p.status='completed') as order_count
    FROM shift_sessions ss JOIN users u ON u.id=ss.cashier_id
    WHERE ss.id=$1 AND ss.tenant_id=$2`,
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
  const { closing_float, notes } = body;

  const row = await queryOne(
    `UPDATE shift_sessions SET status='closed', closing_float=$1, closing_at=NOW(), notes=$2
     WHERE id=$3 AND tenant_id=$4 AND status='open' RETURNING *`,
    [closing_float ?? 0, notes ?? null, id, session.user.tenantId]
  );
  if (!row) return NextResponse.json({ error: "Shift not found or already closed" }, { status: 404 });
  return NextResponse.json(row);
}
