import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";

const CreateTenantSchema = z.object({
  name: z.string().min(2).max(150),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  country_id: z.number().int().positive(),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  plan: z.enum(["starter", "pro", "enterprise"]).default("starter"),
  admin_name: z.string().min(2).max(150),
  admin_email: z.string().email(),
  admin_password: z.string().min(8),
});

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenants = await query(`
    SELECT t.*, c.name as country_name, c.currency_code, c.currency_symbol,
           (SELECT COUNT(*) FROM outlets o WHERE o.tenant_id = t.id) as outlet_count,
           (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) as user_count
    FROM tenants t
    JOIN countries c ON t.country_id = c.id
    ORDER BY t.created_at DESC
  `);
  return NextResponse.json(tenants);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = CreateTenantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid input" }, { status: 400 });
  }

  const { name, slug, country_id, email, phone, address, plan, admin_name, admin_email, admin_password } = parsed.data;

  const existing = await queryOne("SELECT id FROM tenants WHERE slug = $1", [slug]);
  if (existing) {
    return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
  }

  const emailTaken = await queryOne("SELECT id FROM users WHERE email = $1", [admin_email]);
  if (emailTaken) {
    return NextResponse.json({ error: "Admin email already in use" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(admin_password, 10);

  // Use a transaction — both tenant and admin user created together or neither
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const tenantResult = await client.query(
      `INSERT INTO tenants (name, slug, country_id, email, phone, address, plan)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, slug, country_id, email, phone ?? null, address ?? null, plan]
    );
    const tenant = tenantResult.rows[0];

    await client.query(
      `INSERT INTO users (tenant_id, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'admin')`,
      [tenant.id, admin_name, admin_email, passwordHash]
    );

    await client.query("COMMIT");
    return NextResponse.json(tenant, { status: 201 });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[tenants] transaction failed:", err);
    return NextResponse.json({ error: "Failed to create tenant" }, { status: 500 });
  } finally {
    client.release();
  }
}
