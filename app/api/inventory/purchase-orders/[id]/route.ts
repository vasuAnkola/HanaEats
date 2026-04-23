import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import pool from "@/lib/db";
import { apiError, getTenantId, tenantRequired } from "../../_utils";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = getTenantId(session);
    if (!tenantId) return tenantRequired();
    const { id } = await params;

    const po = await queryOne(
      `SELECT po.*, v.name AS vendor_name, o.name AS outlet_name
       FROM purchase_orders po
       LEFT JOIN vendors v ON v.id = po.vendor_id
       LEFT JOIN outlets o ON o.id = po.outlet_id
       WHERE po.id = $1 AND po.tenant_id = $2`,
      [id, tenantId]
    );
    if (!po) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const items = await query(
      `SELECT poi.*, i.name AS ingredient_name, i.unit
       FROM purchase_order_items poi
       JOIN ingredients i ON i.id = poi.ingredient_id
       WHERE poi.purchase_order_id = $1`,
      [id]
    );
    return NextResponse.json({ ...po as object, items });
  } catch (error) {
    return apiError(error, "purchase-orders:id:get");
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

    if (body.action === "receive") {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const items = await query(
          `SELECT poi.*, i.name AS ingredient_name FROM purchase_order_items poi
           JOIN ingredients i ON i.id = poi.ingredient_id
           WHERE poi.purchase_order_id = $1`,
          [id]
        );

        for (const item of items) {
          const receivedQty = parseFloat(String(item.quantity));
          await client.query(
            `UPDATE ingredients SET stock_quantity = stock_quantity + $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
            [receivedQty, item.ingredient_id, tenantId]
          );
          await client.query(
            `UPDATE purchase_order_items SET received_qty = $1 WHERE id = $2`,
            [receivedQty, item.id]
          );
          await client.query(
            `INSERT INTO stock_movements (tenant_id, ingredient_id, movement_type, quantity, unit_cost, reference_id, notes, created_by)
             VALUES ($1,$2,'purchase',$3,$4,$5,$6,$7)`,
            [tenantId, item.ingredient_id, receivedQty, item.unit_cost,
             id, "PO received", session.user.id || null]
          );
        }

        await client.query(
          `UPDATE purchase_orders SET status='received', received_at=NOW() WHERE id=$1 AND tenant_id=$2`,
          [id, tenantId]
        );
        await client.query("COMMIT");
        const updated = await queryOne(`SELECT * FROM purchase_orders WHERE id=$1`, [id]);
        return NextResponse.json(updated);
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    }

    const { status, notes } = body;
    const row = await queryOne(
      `UPDATE purchase_orders SET
         status = COALESCE($1, status),
         notes = COALESCE($2, notes),
         ordered_at = CASE WHEN $1 = 'sent' THEN NOW() ELSE ordered_at END
       WHERE id = $3 AND tenant_id = $4 RETURNING *`,
      [status || null, notes || null, id, tenantId]
    );
    return NextResponse.json(row);
  } catch (error) {
    return apiError(error, "purchase-orders:id:patch");
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = getTenantId(session);
    if (!tenantId) return tenantRequired();
    const { id } = await params;
    await queryOne(
      `DELETE FROM purchase_orders WHERE id=$1 AND tenant_id=$2 AND status='draft'`,
      [id, tenantId]
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "purchase-orders:id:delete");
  }
}
