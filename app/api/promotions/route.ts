import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  void req;
  const rows = await query("SELECT * FROM promotions WHERE tenant_id = $1 ORDER BY start_date DESC", [session.user.tenantId]);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { name, discount_type, discount_value, start_date, end_date, festival_tag, applies_to } = body;
  if (!name || !discount_type || discount_value == null || !start_date || !end_date) {
    return NextResponse.json({ error: "required fields missing" }, { status: 400 });
  }
  const rows = await query(
    "INSERT INTO promotions (tenant_id, name, discount_type, discount_value, start_date, end_date, festival_tag, applies_to) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
    [session.user.tenantId, name, discount_type, parseFloat(String(discount_value)), start_date, end_date, festival_tag || null, applies_to || "all"]
  );
  return NextResponse.json(rows[0], { status: 201 });
}
