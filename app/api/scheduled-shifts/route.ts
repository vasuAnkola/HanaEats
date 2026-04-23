import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const outlet_id = searchParams.get("outlet_id");
  const week_start = searchParams.get("week_start");
  if (!outlet_id || !week_start) return NextResponse.json({ error: "outlet_id and week_start required" }, { status: 400 });
  const rows = await query(
    "SELECT ss.*, u.name as user_name FROM scheduled_shifts ss JOIN users u ON u.id = ss.user_id WHERE ss.tenant_id = $1 AND ss.outlet_id = $2 AND ss.shift_date >= $3::date AND ss.shift_date < ($3::date + INTERVAL '7 days') ORDER BY ss.shift_date, ss.start_time",
    [session.user.tenantId, outlet_id, week_start]
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { outlet_id, user_id, shift_date, start_time, end_time, role_label, notes } = body;
  if (!outlet_id || !user_id || !shift_date || !start_time || !end_time) {
    return NextResponse.json({ error: "required fields missing" }, { status: 400 });
  }
  const rows = await query(
    "INSERT INTO scheduled_shifts (tenant_id, outlet_id, user_id, shift_date, start_time, end_time, role_label, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
    [session.user.tenantId, outlet_id, user_id, shift_date, start_time, end_time, role_label || null, notes || null]
  );
  return NextResponse.json(rows[0], { status: 201 });
}
