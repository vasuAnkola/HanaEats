import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { apiError, getTenantId, tenantRequired } from "../../_utils";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const body = await req.json();
    const tenantId = getTenantId(session, body);
    if (!tenantId) return tenantRequired();
    const { name, contact_name, phone, email, address, notes, is_active } = body;
    const row = await queryOne(
      `UPDATE vendors SET
         name = COALESCE($1, name),
         contact_name = COALESCE($2, contact_name),
         phone = COALESCE($3, phone),
         email = COALESCE($4, email),
         address = COALESCE($5, address),
         notes = COALESCE($6, notes),
         is_active = COALESCE($7, is_active)
       WHERE id = $8 AND tenant_id = $9 RETURNING *`,
      [name || null, contact_name || null, phone || null, email || null,
       address || null, notes || null,
       is_active != null ? is_active : null,
       id, tenantId]
    );
    return NextResponse.json(row);
  } catch (error) {
    return apiError(error, "vendors:id:patch");
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = getTenantId(session);
    if (!tenantId) return tenantRequired();
    const { id } = await params;
    await queryOne(`DELETE FROM vendors WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "vendors:id:delete");
  }
}
