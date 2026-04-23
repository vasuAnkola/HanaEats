import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const outlet_id = searchParams.get("outlet_id");
  let sql = "SELECT c.*, u.name as user_name, o.name as outlet_name FROM commissions c JOIN users u ON u.id = c.user_id LEFT JOIN outlets o ON o.id = c.outlet_id WHERE c.tenant_id = $1";
  const params: unknown[] = [session.user.tenantId];
  if (outlet_id) { params.push(outlet_id); sql += " AND c.outlet_id = $" + params.length; }
  sql += " ORDER BY c.created_at DESC";
  const rows = await query(sql, params);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { outlet_id, user_id, period_start, period_end, commission_rate } = body;
  if (!outlet_id || !user_id || !period_start || !period_end || commission_rate == null) {
    return NextResponse.json({ error: "required fields missing" }, { status: 400 });
  }
  const salesRes = await query(
    "SELECT COALESCE(SUM(p.total_amount), 0) as total_sales, COUNT(p.id) as order_count FROM payments p WHERE p.tenant_id = $1 AND p.outlet_id = $2 AND p.created_by = $3 AND p.status = 'completed' AND p.created_at::date >= $4 AND p.created_at::date <= $5",
    [session.user.tenantId, outlet_id, user_id, period_start, period_end]
  );
  const totalSales = parseFloat(String(salesRes[0]?.total_sales || 0));
  const orderCount = parseInt(String(salesRes[0]?.order_count || 0));
  const rate = parseFloat(String(commission_rate));
  const commissionAmount = totalSales * rate / 100;
  const rows = await query(
    "INSERT INTO commissions (tenant_id, user_id, outlet_id, period_start, period_end, total_sales, commission_rate, commission_amount, order_count) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *",
    [session.user.tenantId, user_id, outlet_id, period_start, period_end, totalSales, rate, commissionAmount, orderCount]
  );
  return NextResponse.json(rows[0], { status: 201 });
}
