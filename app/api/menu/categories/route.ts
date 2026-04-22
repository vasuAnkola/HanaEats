import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { z } from "zod";

const Schema = z.object({
  outlet_id: z.number().int().positive(),
  name: z.string().min(1).max(150),
  description: z.string().optional(),
  image_url: z.string().url().optional(),
  display_order: z.number().int().default(0),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const outletId = searchParams.get("outlet_id");
  if (!outletId) return NextResponse.json({ error: "outlet_id required" }, { status: 400 });

  const tenantId = session.user.tenantId;
  const cats = await query(
    `SELECT mc.*, COUNT(mi.id)::int as item_count
     FROM menu_categories mc
     LEFT JOIN menu_items mi ON mi.category_id = mc.id
     WHERE mc.outlet_id = $1 ${tenantId ? "AND mc.tenant_id = $2" : ""}
     GROUP BY mc.id
     ORDER BY mc.display_order, mc.name`,
    tenantId ? [outletId, tenantId] : [outletId]
  );
  return NextResponse.json(cats);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !["super_admin", "admin", "manager"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid input" }, { status: 400 });
  }

  const { outlet_id, name, description, image_url, display_order } = parsed.data;
  const tenantId = session.user.tenantId ?? body.tenant_id;

  const cat = await queryOne(
    `INSERT INTO menu_categories (outlet_id, tenant_id, name, description, image_url, display_order)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [outlet_id, tenantId, name, description ?? null, image_url ?? null, display_order]
  );
  return NextResponse.json(cat, { status: 201 });
}
