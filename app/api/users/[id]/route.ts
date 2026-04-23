import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import bcrypt from "bcryptjs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || !["super_admin", "admin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  const { name, email, role, is_active, outlet_id, password } = body;

  const existing = await queryOne(
    "SELECT id FROM users WHERE id = $1 AND tenant_id = $2",
    [id, session.user.tenantId]
  );
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let passwordHash: string | null = null;
  if (password) {
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    passwordHash = await bcrypt.hash(password, 10);
  }

  const user = await queryOne(
    `UPDATE users SET
       name = COALESCE($1, name),
       email = COALESCE($2, email),
       role = COALESCE($3, role),
       is_active = COALESCE($4, is_active),
       outlet_id = COALESCE($5, outlet_id),
       ${passwordHash ? "password_hash = $7," : ""}
       updated_at = NOW()
     WHERE id = $6 AND tenant_id = ${passwordHash ? "$8" : "$7"}
     RETURNING id, name, email, role, outlet_id, is_active, last_login_at, created_at`,
    passwordHash
      ? [name || null, email || null, role || null, is_active ?? null, outlet_id ?? null, id, passwordHash, session.user.tenantId]
      : [name || null, email || null, role || null, is_active ?? null, outlet_id ?? null, id, session.user.tenantId]
  );
  return NextResponse.json(user);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || !["super_admin", "admin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  if (id === session.user.id) return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  await queryOne("DELETE FROM users WHERE id = $1 AND tenant_id = $2", [id, session.user.tenantId]);
  return NextResponse.json({ ok: true });
}