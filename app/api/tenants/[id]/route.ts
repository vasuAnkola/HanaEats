import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { z } from "zod";

const UpdateTenantSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  plan: z.enum(["starter", "pro", "enterprise"]).optional(),
  is_active: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const tenant = await queryOne(`
    SELECT t.*, c.name as country_name, c.currency_code, c.currency_symbol, c.tax_name, c.tax_rate
    FROM tenants t
    JOIN countries c ON t.country_id = c.id
    WHERE t.id = $1
  `, [id]);

  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const outlets = await query(
    "SELECT id, name, outlet_type, is_active, phone, address FROM outlets WHERE tenant_id = $1 ORDER BY created_at DESC",
    [id]
  );

  const users = await query(
    "SELECT id, name, email, role, is_active, last_login_at FROM users WHERE tenant_id = $1 ORDER BY created_at DESC",
    [id]
  );

  return NextResponse.json({ ...tenant, outlets, users });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = UpdateTenantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid input" }, { status: 400 });
  }

  const fields = parsed.data;
  const keys = Object.keys(fields) as (keyof typeof fields)[];
  if (keys.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const values = keys.map((k) => fields[k]);

  const tenant = await queryOne(
    `UPDATE tenants SET ${setClauses}, updated_at = NOW() WHERE id = $${keys.length + 1} RETURNING *`,
    [...values, id]
  );

  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(tenant);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Check no active outlets
  const outlets = await query<{ count: string }>(
    "SELECT COUNT(*) as count FROM outlets WHERE tenant_id = $1", [id]
  );
  if (Number(outlets[0].count) > 0) {
    return NextResponse.json(
      { error: "Cannot delete tenant with existing outlets. Deactivate it instead." },
      { status: 409 }
    );
  }

  await queryOne("DELETE FROM users WHERE tenant_id = $1", [id]);
  await queryOne("DELETE FROM tenants WHERE id = $1", [id]);

  return NextResponse.json({ success: true });
}
