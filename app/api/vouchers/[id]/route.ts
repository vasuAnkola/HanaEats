import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const fields: string[] = [];
  const vals: unknown[] = [];
  const allowed = ["code","name","discount_type","discount_value","min_order_amount","max_uses","valid_from","valid_until","is_active"];
  for (const k of allowed) {
    if (body[k] !== undefined) { vals.push(body[k]); fields.push(k + " = $" + vals.length); }
  }
  if (!fields.length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  vals.push(id, session.user.tenantId);
  const rows = await query(
    "UPDATE vouchers SET " + fields.join(", ") + " WHERE id = $" + (vals.length - 1) + " AND tenant_id = $" + vals.length + " RETURNING *",
    vals
  );
  return NextResponse.json(rows[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  void req;
  await query("DELETE FROM vouchers WHERE id = $1 AND tenant_id = $2", [id, session.user.tenantId]);
  return NextResponse.json({ success: true });
}