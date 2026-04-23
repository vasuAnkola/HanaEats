import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  void req;
  const rows = await query("SELECT * FROM vouchers WHERE tenant_id = $1 ORDER BY created_at DESC", [session.user.tenantId]);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { code, name, discount_type, discount_value, min_order_amount, max_uses, valid_from, valid_until } = body;
  if (!code || !name || !discount_type || discount_value == null) return NextResponse.json({ error: "required fields missing" }, { status: 400 });
  const rows = await query("INSERT INTO vouchers (tenant_id, code, name, discount_type, discount_value, min_order_amount, max_uses, valid_from, valid_until) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *", [session.user.tenantId, code.toUpperCase(), name, discount_type, parseFloat(String(discount_value)), parseFloat(String(min_order_amount || 0)), max_uses || null, valid_from || null, valid_until || null]);
  return NextResponse.json(rows[0], { status: 201 });
}