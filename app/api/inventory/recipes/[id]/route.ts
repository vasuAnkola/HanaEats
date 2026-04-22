import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import pool from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const recipe = await queryOne(
    `SELECT r.*, mi.name as menu_item_name, mi.price as menu_item_price
     FROM recipes r
     JOIN menu_items mi ON mi.id = r.menu_item_id
     WHERE r.id = $1 AND r.tenant_id = $2`,
    [id, session.user.tenantId]
  );
  if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const client = await pool.connect();
  const ingRes = await client.query(
    `SELECT ri.*, i.name as ingredient_name, i.unit as ingredient_unit, i.cost_per_unit
     FROM recipe_ingredients ri
     JOIN ingredients i ON i.id = ri.ingredient_id
     WHERE ri.recipe_id = $1`,
    [id]
  );
  client.release();

  return NextResponse.json({ ...recipe, ingredients: ingRes.rows });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json();
  const { yield_quantity, notes, ingredients } = body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const recipeRes = await client.query(
      `UPDATE recipes SET
        yield_quantity = COALESCE($1, yield_quantity),
        notes = COALESCE($2, notes),
        updated_at = NOW()
       WHERE id = $3 AND tenant_id = $4 RETURNING *`,
      [
        yield_quantity != null ? parseFloat(String(yield_quantity)) : null,
        notes ?? null, id, session.user.tenantId,
      ]
    );
    if (!recipeRes.rows[0]) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (Array.isArray(ingredients)) {
      await client.query(`DELETE FROM recipe_ingredients WHERE recipe_id = $1`, [id]);
      for (const ing of ingredients as { ingredient_id: number; quantity_used: number; unit: string }[]) {
        await client.query(
          `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity_used, unit)
           VALUES ($1, $2, $3, $4)`,
          [id, ing.ingredient_id, parseFloat(String(ing.quantity_used)), ing.unit]
        );
      }
    }

    await client.query("COMMIT");
    return NextResponse.json(recipeRes.rows[0]);
  } catch (e) {
    await client.query("ROLLBACK");
    const err = e as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM recipe_ingredients WHERE recipe_id = $1`, [id]);
    await client.query(`DELETE FROM recipes WHERE id = $1 AND tenant_id = $2`, [id, session.user.tenantId]);
    await client.query("COMMIT");
    return NextResponse.json({ ok: true });
  } catch (e) {
    await client.query("ROLLBACK");
    const err = e as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}
