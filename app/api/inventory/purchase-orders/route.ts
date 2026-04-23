import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { apiError, getTenantId, tenantRequired } from "../_utils";

function genPoNumber() {
  return "PO-" + Date.now().toString(36).toUpperCase();
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const tenantId = getTenantId(session, null, searchParams);
    if (!tenantId) return NextResponse.json([]);
    const status = searchParams.get("status");

    const rows = await query(
      `SELECT po.*, v.name AS vendor_name, o.name AS outlet_name,
              u.name AS created_by_name
       FROM purchase_orders po
       LEFT JOIN vendors v ON v.id = po.vendor_id
       LEFT JOIN outlets o ON o.id = po.outlet_id
       LEFT JOIN users u ON u.id = po.created_by
       WHERE po.tenant_id = $1 ${status ? "AND po.status = $2" : ""}
       ORDER BY po.created_at DESC`,
      status ? [tenantId, status] : [tenantId]
    );
    return NextResponse.json(rows);
  } catch (error) {
    return apiError(error, "purchase-orders:get");
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const tenantId = getTenantId(session, body);
    if (!tenantId) return tenantRequired();
    const { vendor_id, outlet_id, notes, items } = body;
    if (!items?.length) return NextResponse.json({ error: "items are required" }, { status: 400 });

    const total = items.reduce((sum: number, it: { quantity: number; unit_cost: number }) =>
      sum + parseFloat(String(it.quantity)) * parseFloat(String(it.unit_cost)), 0);

    const po = await queryOne(
      `INSERT INTO purchase_orders (tenant_id, vendor_id, outlet_id, po_number, total_amount, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [tenantId, vendor_id || null, outlet_id || null, genPoNumber(),
       total, notes || null, session.user.id || null]
    );

    for (const it of items) {
      await queryOne(
        `INSERT INTO purchase_order_items (purchase_order_id, ingredient_id, quantity, unit_cost)
         VALUES ($1,$2,$3,$4)`,
        [(po as Record<string, unknown>)?.id, it.ingredient_id,
         parseFloat(String(it.quantity)), parseFloat(String(it.unit_cost))]
      );
    }
    return NextResponse.json(po, { status: 201 });
  } catch (error) {
    return apiError(error, "purchase-orders:post");
  }
}
