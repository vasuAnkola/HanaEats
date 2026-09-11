import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryOne } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !["super_admin", "admin", "manager"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();

  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (typeof body.is_active === "boolean") { fields.push(`is_active = $${i++}`); values.push(body.is_active); }
  if (typeof body.api_key === "string") { fields.push(`api_key = $${i++}`); values.push(body.api_key || null); }
  if (body.commission_pct !== undefined) { fields.push(`commission_pct = $${i++}`); values.push(parseFloat(body.commission_pct)); }

  if (!fields.length) return NextResponse.json({ error: "No fields to update" }, { status: 400 });

  values.push(id, session.user.tenantId);
  const row = await queryOne(
    `UPDATE delivery_platforms SET ${fields.join(", ")} WHERE id = $${i++} AND tenant_id = $${i} RETURNING *`,
    values
  );
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !["super_admin", "admin", "manager"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await queryOne(
    `DELETE FROM delivery_platforms WHERE id = $1 AND tenant_id = $2 RETURNING id`,
    [id, session.user.tenantId]
  );
  return NextResponse.json({ ok: true });
}
