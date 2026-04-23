import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { apiError, getTenantId, tenantRequired } from "../../_utils";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = getTenantId(session);
    if (!tenantId) return tenantRequired();
    const { id } = await params;
    const recipe = await queryOne(
      `SELECT r.*, mi.name AS menu_item_name FROM recipes r
       LEFT JOIN menu_items mi ON mi.id = r.menu_item_id
       WHERE r.id = $1 AND r.tenant_id = $2`,
      [id, tenantId]
    );
    if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const ingredients = await query(
      `SELECT ri.*, i.name AS ingredient_name, i.unit AS ingredient_unit,
              i.cost_per_unit, i.stock_quantity
       FROM recipe_ingredients ri
       JOIN ingredients i ON i.id = ri.ingredient_id
       WHERE ri.recipe_id = $1`,
      [id]
    );

    const cost = ingredients.reduce((sum: number, ri: Record<string, unknown>) =>
      sum + parseFloat(String(ri.quantity)) * parseFloat(String(ri.cost_per_unit)), 0);

    return NextResponse.json({ ...recipe as object, ingredients, cost_per_serving: cost.toFixed(4) });
  } catch (error) {
    return apiError(error, "recipes:id:get");
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const body = await req.json();
    const tenantId = getTenantId(session, body);
    if (!tenantId) return tenantRequired();
    const { name, menu_item_id, yield_qty, yield_unit, instructions, is_active, ingredients } = body;

    const row = await queryOne(
      `UPDATE recipes SET
         name = COALESCE($1, name),
         menu_item_id = COALESCE($2, menu_item_id),
         yield_qty = COALESCE($3, yield_qty),
         yield_unit = COALESCE($4, yield_unit),
         instructions = COALESCE($5, instructions),
         is_active = COALESCE($6, is_active)
       WHERE id = $7 AND tenant_id = $8 RETURNING *`,
      [name || null, menu_item_id || null,
       yield_qty != null ? parseFloat(String(yield_qty)) : null,
       yield_unit || null, instructions || null,
       is_active != null ? is_active : null,
       id, tenantId]
    );

    if (ingredients) {
      await queryOne(`DELETE FROM recipe_ingredients WHERE recipe_id = $1`, [id]);
      for (const ing of ingredients) {
        await queryOne(
          `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
           VALUES ($1,$2,$3,$4)`,
          [id, ing.ingredient_id, parseFloat(String(ing.quantity)), ing.unit]
        );
      }
    }
    return NextResponse.json(row);
  } catch (error) {
    return apiError(error, "recipes:id:patch");
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = getTenantId(session);
    if (!tenantId) return tenantRequired();
    const { id } = await params;
    await queryOne(`DELETE FROM recipes WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "recipes:id:delete");
  }
}
