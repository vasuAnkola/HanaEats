import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { z } from "zod";

const Schema = z.object({
  category_id: z.number().int().positive().optional(),
  name: z.string().min(1).max(150).optional(),
  description: z.string().nullable().optional(),
  sku: z.string().max(100).nullable().optional(),
  price: z.number().min(0).optional(),
  cost: z.number().min(0).optional(),
  image_url: z.string().url().nullable().optional(),
  prep_time: z.number().int().min(0).nullable().optional(),
  calories: z.number().int().min(0).nullable().optional(),
  display_order: z.number().int().optional(),
  is_available: z.boolean().optional(),
  dietary: z.object({
    is_vegan: z.boolean(),
    is_vegetarian: z.boolean(),
    is_halal: z.boolean(),
    is_gluten_free: z.boolean(),
    contains_nuts: z.boolean(),
  }).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const item = await queryOne(
    `SELECT mi.*, d.is_vegan, d.is_vegetarian, d.is_halal, d.is_gluten_free, d.contains_nuts,
     mc.name as category_name
     FROM menu_items mi
     LEFT JOIN menu_item_dietary d ON d.item_id = mi.id
     LEFT JOIN menu_categories mc ON mc.id = mi.category_id
     WHERE mi.id = $1`,
    [id]
  );
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const variants = await query(
    `SELECT mv.*, json_agg(mvo.* ORDER BY mvo.display_order) as options
     FROM menu_variants mv
     LEFT JOIN menu_variant_options mvo ON mvo.variant_id = mv.id
     WHERE mv.item_id = $1
     GROUP BY mv.id ORDER BY mv.display_order`,
    [id]
  );

  const addons = await query(
    `SELECT mag.*, json_agg(ma.* ORDER BY ma.display_order) as add_ons
     FROM menu_add_on_groups mag
     LEFT JOIN menu_add_ons ma ON ma.group_id = mag.id
     WHERE mag.item_id = $1
     GROUP BY mag.id ORDER BY mag.display_order`,
    [id]
  );

  return NextResponse.json({ ...item, variants, addons });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || !["super_admin", "admin", "manager"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid input" }, { status: 400 });
  }

  const { dietary, ...rest } = parsed.data;
  const keys = Object.keys(rest) as (keyof typeof rest)[];

  if (keys.length > 0) {
    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
    const values = keys.map((k) => rest[k]);
    await queryOne(
      `UPDATE menu_items SET ${setClauses}, updated_at = NOW() WHERE id = $${keys.length + 1} RETURNING id`,
      [...values, id]
    );
  }

  if (dietary) {
    await queryOne(
      `INSERT INTO menu_item_dietary (item_id, is_vegan, is_vegetarian, is_halal, is_gluten_free, contains_nuts)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (item_id) DO UPDATE SET is_vegan=$2, is_vegetarian=$3, is_halal=$4, is_gluten_free=$5, contains_nuts=$6`,
      [id, dietary.is_vegan, dietary.is_vegetarian, dietary.is_halal, dietary.is_gluten_free, dietary.contains_nuts]
    );
  }

  const updated = await queryOne(
    `SELECT mi.*, d.is_vegan, d.is_vegetarian, d.is_halal, d.is_gluten_free, d.contains_nuts
     FROM menu_items mi LEFT JOIN menu_item_dietary d ON d.item_id = mi.id WHERE mi.id = $1`,
    [id]
  );
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || !["super_admin", "admin", "manager"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await queryOne("DELETE FROM menu_items WHERE id = $1", [id]);
  return NextResponse.json({ success: true });
}
