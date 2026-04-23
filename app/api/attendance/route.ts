import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const outlet_id = searchParams.get("outlet_id");
  const user_id = searchParams.get("user_id");
  let sql = "SELECT a.*, u.name as user_name, o.name as outlet_name FROM attendance a JOIN users u ON u.id = a.user_id LEFT JOIN outlets o ON o.id = a.outlet_id WHERE a.tenant_id = $1";
  const params: unknown[] = [session.user.tenantId];
  if (outlet_id) { params.push(outlet_id); sql += " AND a.outlet_id = $" + params.length; }
  if (user_id)   { params.push(user_id);   sql += " AND a.user_id = $" + params.length; }
  sql += " ORDER BY a.clock_in DESC LIMIT 100";
  const rows = await query(sql, params);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { action, attendance_id, outlet_id, user_id } = body;
  if (action === "clock_out") {
    if (!attendance_id) return NextResponse.json({ error: "attendance_id required" }, { status: 400 });
    const rows = await query(
      "UPDATE attendance SET clock_out = NOW(), duration_minutes = EXTRACT(EPOCH FROM (NOW() - clock_in))::integer / 60 WHERE id = $1 AND tenant_id = $2 AND clock_out IS NULL RETURNING *",
      [attendance_id, session.user.tenantId]
    );
    if (!rows[0]) return NextResponse.json({ error: "Not found or already clocked out" }, { status: 400 });
    return NextResponse.json(rows[0]);
  }
  const targetUserId = user_id || session.user.id;
  if (!outlet_id) return NextResponse.json({ error: "outlet_id required" }, { status: 400 });
  const open = await query(
    "SELECT id FROM attendance WHERE user_id = $1 AND tenant_id = $2 AND clock_out IS NULL",
    [targetUserId, session.user.tenantId]
  );
  if (open.length > 0) return NextResponse.json({ error: "User already clocked in" }, { status: 400 });
  const rows = await query(
    "INSERT INTO attendance (tenant_id, user_id, outlet_id) VALUES ($1, $2, $3) RETURNING *",
    [session.user.tenantId, targetUserId, outlet_id]
  );
  return NextResponse.json(rows[0], { status: 201 });
}
