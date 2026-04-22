import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryOne, query } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json();
  const { name, contact_name, phone, email, address, lead_time_days } = body;

  const row = await queryOne(
    `UPDATE vendors SET
      name = COALESCE($1, name),
      contact_name = COALESCE($2, contact_name),
      phone = COALESCE($3, phone),
      email = COALESCE($4, email),
      address = COALESCE($5, address),
      lead_time_days = COALESCE($6, lead_time_days)
     WHERE id = $7 AND tenant_id = $8 RETURNING *`,
    [
      name ?? null, contact_name ?? null, phone ?? null,
      email ?? null, address ?? null,
      lead_time_days != null ? parseInt(String(lead_time_days)) : null,
      id, session.user.tenantId,
    ]
  );
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  await query(
    `UPDATE vendors SET is_active = false WHERE id = $1 AND tenant_id = $2`,
    [id, session.user.tenantId]
  );
  return NextResponse.json({ ok: true });
}
