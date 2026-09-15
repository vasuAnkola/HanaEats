import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import pool from "@/lib/db";
import { apiError, getTenantId, tenantRequired, canManageInventory, inventoryForbidden } from "../../_utils";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = getTenantId(session);
    if (!tenantId) return tenantRequired();
    const { id } = await params;
    const row = await queryOne(
      `SELECT i.id, i.name, i.unit, i.cost_per_unit, i.calories_per_unit, i.barcode,
              i.current_stock AS stock_quantity,
              i.reorder_level AS low_stock_threshold,
              i.outlet_id, i.category_id, i.is_active,
              ic.name AS category_name
       FROM ingredients i
       LEFT JOIN ingredient_categories ic ON ic.id = i.category_id
       WHERE i.id = $1 AND i.tenant_id = $2`,
      [id, tenantId]
    );
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (error) {
    return apiError(error, "ingredients:id:get");
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageInventory(session)) return inventoryForbidden();
    const { id } = await params;
    const body = await req.json();
    const tenantId = getTenantId(session, body);
    if (!tenantId) return tenantRequired();

    // Stock adjustment action
    if (body.action === "adjust") {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const rawQty = parseFloat(String(body.quantity || 0));
        const movementType = body.movement_type || "adjustment";
        // Wastage always reduces stock — the magnitude the user enters ("5 kg wasted")
        // is a quantity, not a signed delta, so it must not depend on them remembering
        // to type it as negative. "adjustment"/"opening" keep the signed value as-is
        // since those are meant to set/correct stock in either direction.
        const delta = movementType === "wastage" ? -Math.abs(rawQty) : rawQty;
        await client.query(
          `UPDATE ingredients SET current_stock = current_stock + $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
          [delta, id, tenantId]
        );
        await client.query(
          `INSERT INTO stock_movements (tenant_id, ingredient_id, movement_type, quantity, unit_cost, notes, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [tenantId, id, movementType, delta,
           body.unit_cost ? parseFloat(String(body.unit_cost)) : null,
           body.notes || null, session.user.id || null]
        );
        await client.query("COMMIT");
        const updated = await queryOne(
          `SELECT id, name, unit, cost_per_unit, current_stock AS stock_quantity, reorder_level AS low_stock_threshold FROM ingredients WHERE id = $1 AND tenant_id = $2`,
          [id, tenantId]
        );
        return NextResponse.json(updated);
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    }

    // Regular update
    const { name, unit, cost_per_unit, calories_per_unit, barcode, low_stock_threshold, category_id, is_active } = body;

    if (barcode) {
      const dupe = await queryOne(`SELECT id FROM ingredients WHERE tenant_id = $1 AND barcode = $2 AND id != $3`, [tenantId, barcode, id]);
      if (dupe) return NextResponse.json({ error: "Another ingredient already uses this barcode" }, { status: 409 });
    }

    const row = await queryOne(
      `UPDATE ingredients SET
         name = COALESCE($1, name),
         unit = COALESCE($2, unit),
         cost_per_unit = COALESCE($3, cost_per_unit),
         reorder_level = COALESCE($4, reorder_level),
         category_id = COALESCE($5, category_id),
         is_active = COALESCE($6, is_active),
         calories_per_unit = COALESCE($9, calories_per_unit),
         barcode = COALESCE($10, barcode),
         updated_at = NOW()
       WHERE id = $7 AND tenant_id = $8
       RETURNING id, name, unit, cost_per_unit, calories_per_unit, barcode,
         current_stock AS stock_quantity,
         reorder_level AS low_stock_threshold,
         outlet_id, category_id, is_active`,
      [name || null, unit || null,
       cost_per_unit != null ? parseFloat(String(cost_per_unit)) : null,
       low_stock_threshold != null ? parseFloat(String(low_stock_threshold)) : null,
       category_id || null,
       is_active != null ? is_active : null,
       id, tenantId,
       calories_per_unit != null && calories_per_unit !== "" ? parseFloat(String(calories_per_unit)) : null,
       barcode || null]
    );
    return NextResponse.json(row);
  } catch (error) {
    return apiError(error, "ingredients:id:patch");
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageInventory(session)) return inventoryForbidden();
    const tenantId = getTenantId(session);
    if (!tenantId) return tenantRequired();
    const { id } = await params;
    await queryOne(`DELETE FROM ingredients WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "ingredients:id:delete");
  }
}
