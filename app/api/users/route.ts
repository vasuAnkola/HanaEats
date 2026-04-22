import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";

const CreateUserSchema = z.object({
  name: z.string().min(2).max(150),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["admin", "manager", "cashier", "waiter", "kitchen"]),
  outlet_id: z.number().int().positive().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !["super_admin", "admin", "manager"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);

  if (session.user.role === "super_admin") {
    const tenantId = searchParams.get("tenant_id");
    const users = tenantId
      ? await query(
          "SELECT id, name, email, role, outlet_id, is_active, last_login_at, created_at FROM users WHERE tenant_id = $1 ORDER BY created_at DESC",
          [tenantId]
        )
      : await query(
          "SELECT id, name, email, role, tenant_id, is_active, last_login_at, created_at FROM users ORDER BY created_at DESC LIMIT 100"
        );
    return NextResponse.json(users);
  }

  const users = await query(
    "SELECT id, name, email, role, outlet_id, is_active, last_login_at, created_at FROM users WHERE tenant_id = $1 ORDER BY created_at DESC",
    [session.user.tenantId]
  );
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !["super_admin", "admin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = CreateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid input" }, { status: 400 });
  }

  const existing = await queryOne("SELECT id FROM users WHERE email = $1", [parsed.data.email]);
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const tenantId = body.tenant_id ?? session.user.tenantId;
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const user = await queryOne(
    `INSERT INTO users (tenant_id, outlet_id, name, email, password_hash, role)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, email, role, is_active, created_at`,
    [tenantId, parsed.data.outlet_id ?? null, parsed.data.name, parsed.data.email, passwordHash, parsed.data.role]
  );

  return NextResponse.json(user, { status: 201 });
}
