import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import pool from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const po = await queryOne(
    `SELECT po.*, v.name as vendor_name
     FROM purchase_orders po
     LEFT JOIN vendors v ON v.id = po.vendor_id
     WHERE po.id = $1 AND po.tenant_id = $2`,
    [id, session.user.tenantId]
  );
  if (!po) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const client = await pool.connect();
  const itemsRes = await client.query(
    `SELECT poi.*, i.name as ingredient_name, i.unit
     FROM purchase_order_items poi
     JOIN ingredients i ON i.id = poi.ingredient_id
     WHERE poi.po_id = $1`,
    [id]
  );
  client.release();

  return NextResponse.json({ ...po, items: itemsRes.rows });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json();
  const { status, expected_date, notes } = body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const poRes = await client.query(
      `SELECT * FROM purchase_orders WHERE id = $1 AND tenant_id = $2`,
      [id, session.user.tenantId]
    );
    if (!poRes.rows[0]) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const po = poRes.rows[0];

    if (status === "received" && po.status !== "received") {
      const itemsRes = await client.query(
        `SELECT * FROM purchase_order_items WHERE po_id = $1`,
        [id]
      );

      for (const item of itemsRes.rows) {
        const qty = parseFloat(String(item.quantity_ordered));
        await client.query(
          `UPDATE ingredients SET current_stock = current_stock + $1, updated_at = NOW()
           WHERE id = $2 AND tenant_id = $3`,
          [qty, item.ingredient_id, session.user.tenantId]
        );
        await client.query(
          `INSERT INTO stock_movements (ingredient_id, outlet_id, tenant_id, type, quantity, note, reference, created_by)
           VALUES ($1, $2, $3, 'in', $4, $5, $6, $7)`,
          [
            item.ingredient_id, po.outlet_id, session.user.tenantId, qty,
            `PO received: ${po.po_number}`, po.po_number, session.user.id,
          ]
        );
        await client.query(
          `UPDATE purchase_order_items SET quantity_received = quantity_ordered WHERE id = $1`,
          [item.id]
        );
      }
    }

    const updatedRes = await client.query(
      `UPDATE purchase_orders SET
        status = COALESCE($1, status),
        expected_date = COALESCE($2, expected_date),
        notes = COALESCE($3, notes),
        updated_at = NOW()
       WHERE id = $4 AND tenant_id = $5 RETURNING *`,
      [status ?? null, expected_date ?? null, notes ?? null, id, session.user.tenantId]
    );

    await client.query("COMMIT");
    return NextResponse.json(updatedRes.rows[0]);
  } catch (e) {
    await client.query("ROLLBACK");
    const err = e as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}
