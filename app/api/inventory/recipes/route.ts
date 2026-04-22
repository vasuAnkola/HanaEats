import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await query(
    `SELECT r.*, mi.name AS menu_item_name
     FROM recipes r
     LEFT JOIN menu_items mi ON mi.id = r.menu_item_id
     WHERE r.tenant_id = $1 ORDER BY r.name`,
    [session.user.tenantId]
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId;
  const { name, menu_item_id, yield_qty, yield_unit, instructions, ingredients } = await req.json();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const recipe = await queryOne(
    `INSERT INTO recipes (tenant_id, menu_item_id, name, yield_qty, yield_unit, instructions)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [tenantId, menu_item_id || null, name,
     parseFloat(String(yield_qty || 1)),
     yield_unit || "serving",
     instructions || null]
  );

  if (ingredients?.length) {
    for (const ing of ingredients) {
      await queryOne(
        `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
         VALUES ($1,$2,$3,$4)`,
        [(recipe as Record<string, unknown>)?.id, ing.ingredient_id,
         parseFloat(String(ing.quantity)), ing.unit]
      );
    }
  }
  return NextResponse.json(recipe, { status: 201 });
}
