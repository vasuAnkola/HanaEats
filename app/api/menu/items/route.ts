import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { z } from "zod";

const Schema = z.object({
  category_id: z.number().int().positive(),
  outlet_id: z.number().int().positive(),
  name: z.string().min(1).max(150),
  description: z.string().optional(),
  sku: z.string().max(100).optional(),
  price: z.number().min(0),
  cost: z.number().min(0).default(0),
  image_url: z.string().url().optional(),
  prep_time: z.number().int().min(0).optional(),
  calories: z.number().int().min(0).optional(),
  display_order: z.number().int().default(0),
  dietary: z.object({
    is_vegan: z.boolean().default(false),
    is_vegetarian: z.boolean().default(false),
    is_halal: z.boolean().default(false),
    is_gluten_free: z.boolean().default(false),
    contains_nuts: z.boolean().default(false),
  }).optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("category_id");
  const outletId = searchParams.get("outlet_id");

  if (!outletId && !categoryId) return NextResponse.json({ error: "outlet_id or category_id required" }, { status: 400 });

  const tenantId = session.user.tenantId;
  let sql: string;
  let args: unknown[];

  if (categoryId) {
    sql = `SELECT mi.*, d.is_vegan, d.is_vegetarian, d.is_halal, d.is_gluten_free, d.contains_nuts,
           mc.name as category_name,
           (SELECT COUNT(*)::int FROM menu_variants WHERE item_id = mi.id) as variant_count,
           (SELECT COUNT(*)::int FROM menu_add_on_groups WHERE item_id = mi.id) as addon_group_count
           FROM menu_items mi
           LEFT JOIN menu_item_dietary d ON d.item_id = mi.id
           LEFT JOIN menu_categories mc ON mc.id = mi.category_id
           WHERE mi.category_id = $1 ${tenantId ? "AND mi.tenant_id = $2" : ""}
           ORDER BY mi.display_order, mi.name`;
    args = tenantId ? [categoryId, tenantId] : [categoryId];
  } else {
    sql = `SELECT mi.*, d.is_vegan, d.is_vegetarian, d.is_halal, d.is_gluten_free, d.contains_nuts,
           mc.name as category_name,
           (SELECT COUNT(*)::int FROM menu_variants WHERE item_id = mi.id) as variant_count,
           (SELECT COUNT(*)::int FROM menu_add_on_groups WHERE item_id = mi.id) as addon_group_count
           FROM menu_items mi
           LEFT JOIN menu_item_dietary d ON d.item_id = mi.id
           LEFT JOIN menu_categories mc ON mc.id = mi.category_id
           WHERE mi.outlet_id = $1 ${tenantId ? "AND mi.tenant_id = $2" : ""}
           ORDER BY mc.display_order, mi.display_order, mi.name`;
    args = tenantId ? [outletId, tenantId] : [outletId];
  }

  const items = await query(sql, args);
  return NextResponse.json(items);
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

  const { category_id, outlet_id, name, description, sku, price, cost, image_url, prep_time, calories, display_order, dietary } = parsed.data;
  const tenantId = session.user.tenantId ?? body.tenant_id;

  const item = await queryOne(
    `INSERT INTO menu_items (category_id, outlet_id, tenant_id, name, description, sku, price, cost, image_url, prep_time, calories, display_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [category_id, outlet_id, tenantId, name, description ?? null, sku ?? null, price, cost, image_url ?? null, prep_time ?? null, calories ?? null, display_order]
  );

  if (dietary && item) {
    await queryOne(
      `INSERT INTO menu_item_dietary (item_id, is_vegan, is_vegetarian, is_halal, is_gluten_free, contains_nuts)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (item_id) DO UPDATE SET is_vegan=$2, is_vegetarian=$3, is_halal=$4, is_gluten_free=$5, contains_nuts=$6`,
      [(item as Record<string, unknown>).id, dietary.is_vegan, dietary.is_vegetarian, dietary.is_halal, dietary.is_gluten_free, dietary.contains_nuts]
    );
  }

  return NextResponse.json(item, { status: 201 });
}
