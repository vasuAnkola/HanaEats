import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { z } from "zod";

const CreateOutletSchema = z.object({
  name: z.string().min(2).max(150),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  outlet_type: z.enum([
    "restaurant", "cafe", "bakery", "food_truck", "hawker", "qsr",
    "cloud_kitchen", "bar", "tea_house", "juice_shop",
  ]).default("restaurant"),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tenantId = session.user.role === "super_admin"
    ? searchParams.get("tenant_id")
    : session.user.tenantId;

  if (!tenantId) return NextResponse.json([]);

  const outlets = await query(
    "SELECT * FROM outlets WHERE tenant_id = $1 ORDER BY created_at DESC",
    [tenantId]
  );
  return NextResponse.json(outlets);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !["super_admin", "admin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = CreateOutletSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid input" }, { status: 400 });
  }

  const tenantId = body.tenant_id ?? session.user.tenantId;
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const { name, address, phone, email, outlet_type } = parsed.data;

  const outlet = await queryOne(
    `INSERT INTO outlets (tenant_id, name, address, phone, email, outlet_type)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [tenantId, name, address ?? null, phone ?? null, email ?? null, outlet_type]
  );

  return NextResponse.json(outlet, { status: 201 });
}
