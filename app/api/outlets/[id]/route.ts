import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { z } from "zod";

const UpdateOutletSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  outlet_type: z.enum([
    "restaurant", "cafe", "bakery", "food_truck", "hawker", "qsr",
    "cloud_kitchen", "bar", "tea_house", "juice_shop",
  ]).optional(),
  is_active: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const outlet = await queryOne(
    "SELECT * FROM outlets WHERE id = $1",
    [id]
  );
  if (!outlet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role !== "super_admin" && outlet.tenant_id !== session.user.tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(outlet);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || !["super_admin", "admin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = UpdateOutletSchema.safeParse(body);
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

  const outlet = await queryOne(
    `UPDATE outlets SET ${setClauses}, updated_at = NOW() WHERE id = $${keys.length + 1} RETURNING *`,
    [...values, id]
  );

  if (!outlet) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(outlet);
}
