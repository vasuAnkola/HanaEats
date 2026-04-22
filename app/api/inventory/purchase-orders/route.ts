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
    `SELECT po.*, v.name as vendor_name,
      (SELECT COUNT(*)::int FROM purchase_order_items WHERE po_id = po.id) as items_count
     FROM purchase_orders po
     LEFT JOIN vendors v ON v.id = po.vendor_id
     WHERE po.outlet_id = $1 AND po.tenant_id = $2
     ORDER BY po.created_at DESC`,
    [outletId, session.user.tenantId]
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { outlet_id, vendor_id, expected_date, notes, items } = body;

  if (!outlet_id || !items?.length) {
    return NextResponse.json({ error: "outlet_id and items required" }, { status: 400 });
  }

  const poNumber = `PO-${Date.now().toString().slice(-10)}`;
  const totalCost = (items as { quantity_ordered: number; unit_cost: number }[]).reduce(
    (sum, item) => sum + parseFloat(String(item.quantity_ordered)) * parseFloat(String(item.unit_cost)),
    0
  );

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const poRes = await client.query(
      `INSERT INTO purchase_orders (tenant_id, outlet_id, vendor_id, po_number, expected_date, notes, total_cost, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        session.user.tenantId, outlet_id, vendor_id || null,
        poNumber, expected_date || null, notes || null,
        totalCost, session.user.id,
      ]
    );
    const po = poRes.rows[0];

    for (const item of items as { ingredient_id: number; quantity_ordered: number; unit_cost: number }[]) {
      await client.query(
        `INSERT INTO purchase_order_items (po_id, ingredient_id, quantity_ordered, unit_cost)
         VALUES ($1, $2, $3, $4)`,
        [po.id, item.ingredient_id, parseFloat(String(item.quantity_ordered)), parseFloat(String(item.unit_cost))]
      );
    }

    await client.query("COMMIT");
    return NextResponse.json(po, { status: 201 });
  } catch (e) {
    await client.query("ROLLBACK");
    const err = e as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}
