import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import pool from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const outletId = searchParams.get("outlet_id");
  if (!outletId) return NextResponse.json({ error: "outlet_id required" }, { status: 400 });

  const rows = await query(
    `SELECT r.*, mi.name as menu_item_name, mi.price as menu_item_price,
      (SELECT COUNT(*)::int FROM recipe_ingredients WHERE recipe_id = r.id) as ingredient_count
     FROM recipes r
     JOIN menu_items mi ON mi.id = r.menu_item_id
     WHERE r.outlet_id = $1 AND r.tenant_id = $2
     ORDER BY mi.name`,
    [outletId, session.user.tenantId]
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { menu_item_id, outlet_id, yield_quantity, notes, ingredients } = body;

  if (!menu_item_id || !outlet_id) {
    return NextResponse.json({ error: "menu_item_id and outlet_id required" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const recipeRes = await client.query(
      `INSERT INTO recipes (menu_item_id, outlet_id, tenant_id, yield_quantity, notes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (menu_item_id, outlet_id) DO UPDATE SET
         yield_quantity = EXCLUDED.yield_quantity,
         notes = EXCLUDED.notes,
         updated_at = NOW()
       RETURNING *`,
      [
        menu_item_id, outlet_id, session.user.tenantId,
        parseFloat(String(yield_quantity ?? 1)), notes || null,
      ]
    );
    const recipe = recipeRes.rows[0];

    await client.query(`DELETE FROM recipe_ingredients WHERE recipe_id = $1`, [recipe.id]);

    if (Array.isArray(ingredients)) {
      for (const ing of ingredients as { ingredient_id: number; quantity_used: number; unit: string }[]) {
        await client.query(
          `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity_used, unit)
           VALUES ($1, $2, $3, $4)`,
          [recipe.id, ing.ingredient_id, parseFloat(String(ing.quantity_used)), ing.unit]
        );
      }
    }

    await client.query("COMMIT");
    return NextResponse.json(recipe, { status: 201 });
  } catch (e) {
    await client.query("ROLLBACK");
    const err = e as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}
