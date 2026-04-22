import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import pool from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const ingredientId = searchParams.get("ingredient_id");
  const outletId = searchParams.get("outlet_id");

  if (!ingredientId && !outletId) {
    return NextResponse.json({ error: "ingredient_id or outlet_id required" }, { status: 400 });
  }

  let sql = `
    SELECT sm.*, i.name as ingredient_name, i.unit, u.name as created_by_name
    FROM stock_movements sm
    JOIN ingredients i ON i.id = sm.ingredient_id
    LEFT JOIN users u ON u.id = sm.created_by
    WHERE sm.tenant_id = $1
  `;
  const params: unknown[] = [session.user.tenantId];

  if (ingredientId) { params.push(ingredientId); sql += ` AND sm.ingredient_id = $${params.length}`; }
  if (outletId) { params.push(outletId); sql += ` AND sm.outlet_id = $${params.length}`; }

  sql += ` ORDER BY sm.created_at DESC LIMIT 100`;

  const rows = await query(sql, params);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { ingredient_id, outlet_id, type, quantity, note, reference } = body;

  if (!ingredient_id || !outlet_id || !type || quantity == null) {
    return NextResponse.json({ error: "ingredient_id, outlet_id, type, quantity required" }, { status: 400 });
  }

  const validTypes = ["in", "out", "adjust", "waste", "transfer"];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const qty = parseFloat(String(quantity));
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const mvRes = await client.query(
      `INSERT INTO stock_movements (ingredient_id, outlet_id, tenant_id, type, quantity, note, reference, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [ingredient_id, outlet_id, session.user.tenantId, type, qty, note || null, reference || null, session.user.id]
    );

    if (type === "in") {
      await client.query(
        `UPDATE ingredients SET current_stock = current_stock + $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
        [qty, ingredient_id, session.user.tenantId]
      );
    } else if (type === "out" || type === "waste") {
      await client.query(
        `UPDATE ingredients SET current_stock = GREATEST(0, current_stock - $1), updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
        [qty, ingredient_id, session.user.tenantId]
      );
    } else if (type === "adjust") {
      await client.query(
        `UPDATE ingredients SET current_stock = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
        [qty, ingredient_id, session.user.tenantId]
      );
    }

    await client.query("COMMIT");
    return NextResponse.json(mvRes.rows[0], { status: 201 });
  } catch (e) {
    await client.query("ROLLBACK");
    const err = e as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}
