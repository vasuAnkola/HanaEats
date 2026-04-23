import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { apiError, getTenantId, tenantRequired } from "../_utils";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const tenantId = getTenantId(session, null, searchParams);
    if (!tenantId) return NextResponse.json([]);
    const rows = await query(
      `SELECT r.*, mi.name AS menu_item_name
       FROM recipes r
       LEFT JOIN menu_items mi ON mi.id = r.menu_item_id
       WHERE r.tenant_id = $1 ORDER BY r.name`,
      [tenantId]
    );
    return NextResponse.json(rows);
  } catch (error) {
    return apiError(error, "recipes:get");
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const tenantId = getTenantId(session, body);
    if (!tenantId) return tenantRequired();
    const { name, menu_item_id, yield_qty, yield_unit, instructions, ingredients } = body;
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
  } catch (error) {
    return apiError(error, "recipes:post");
  }
}
