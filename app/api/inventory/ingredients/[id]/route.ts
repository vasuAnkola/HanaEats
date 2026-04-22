import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import pool from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const row = await queryOne(
    `SELECT i.*, ic.name AS category_name FROM ingredients i
     LEFT JOIN ingredient_categories ic ON ic.id = i.category_id
     WHERE i.id = $1 AND i.tenant_id = $2`,
    [params.id, session.user.tenantId]
  );
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId;
  const body = await req.json();

  // Stock adjustment action
  if (body.action === "adjust") {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const qty = parseFloat(String(body.quantity || 0));
      await client.query(
        `UPDATE ingredients SET stock_quantity = stock_quantity + $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
        [qty, params.id, tenantId]
      );
      await client.query(
        `INSERT INTO stock_movements (tenant_id, ingredient_id, movement_type, quantity, unit_cost, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [tenantId, params.id, body.movement_type || "adjustment", qty,
         body.unit_cost ? parseFloat(String(body.unit_cost)) : null,
         body.notes || null, session.user.id || null]
      );
      await client.query("COMMIT");
      const updated = await queryOne(`SELECT * FROM ingredients WHERE id = $1`, [params.id]);
      return NextResponse.json(updated);
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  // Regular update
  const { name, unit, cost_per_unit, low_stock_threshold, category_id, is_active } = body;
  const row = await queryOne(
    `UPDATE ingredients SET
       name = COALESCE($1, name),
       unit = COALESCE($2, unit),
       cost_per_unit = COALESCE($3, cost_per_unit),
       low_stock_threshold = COALESCE($4, low_stock_threshold),
       category_id = COALESCE($5, category_id),
       is_active = COALESCE($6, is_active),
       updated_at = NOW()
     WHERE id = $7 AND tenant_id = $8 RETURNING *`,
    [name || null, unit || null,
     cost_per_unit != null ? parseFloat(String(cost_per_unit)) : null,
     low_stock_threshold != null ? parseFloat(String(low_stock_threshold)) : null,
     category_id || null,
     is_active != null ? is_active : null,
     params.id, tenantId]
  );
  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await queryOne(`DELETE FROM ingredients WHERE id = $1 AND tenant_id = $2`, [params.id, session.user.tenantId]);
  return NextResponse.json({ ok: true });
}
