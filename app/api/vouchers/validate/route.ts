import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { code, order_amount } = body;
  if (!code) return NextResponse.json({ valid: false, reason: "No code provided" });
  const rows = await query(
    "SELECT * FROM vouchers WHERE tenant_id = $1 AND code = $2 AND is_active = TRUE",
    [session.user.tenantId, code.toUpperCase()]
  );
  if (!rows[0]) return NextResponse.json({ valid: false, reason: "Invalid or inactive voucher code" });
  const v = rows[0];
  const today = new Date().toISOString().split("T")[0];
  if (v.valid_from && today < v.valid_from) return NextResponse.json({ valid: false, reason: "Voucher not yet valid" });
  if (v.valid_until && today > v.valid_until) return NextResponse.json({ valid: false, reason: "Voucher has expired" });
  if (v.max_uses != null && parseInt(String(v.used_count)) >= parseInt(String(v.max_uses))) return NextResponse.json({ valid: false, reason: "Usage limit reached" });
  if (order_amount != null && parseFloat(String(order_amount)) < parseFloat(String(v.min_order_amount))) {
    return NextResponse.json({ valid: false, reason: "Minimum order amount is " + parseFloat(String(v.min_order_amount)).toFixed(2) });
  }
  return NextResponse.json({ valid: true, voucher: v });
}
