import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { apiError, getTenantId, tenantRequired } from "../_utils";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const tenantId = getTenantId(session, null, searchParams);
    if (!tenantId) return NextResponse.json([]);
    const categoryId = searchParams.get("category_id");

    const rows = await query(
      `SELECT i.id, i.name, i.unit, i.cost_per_unit,
              i.current_stock AS stock_quantity,
              i.reorder_level AS low_stock_threshold,
              i.is_active, i.outlet_id, i.category_id,
              ic.name AS category_name
       FROM ingredients i
       LEFT JOIN ingredient_categories ic ON ic.id = i.category_id
       WHERE i.tenant_id = $1 ${categoryId ? "AND i.category_id = $2" : ""}
       ORDER BY i.name`,
      categoryId ? [tenantId, categoryId] : [tenantId]
    );
    return NextResponse.json(rows);
  } catch (error) {
    return apiError(error, "ingredients:get");
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const tenantId = getTenantId(session, body);
    if (!tenantId) return tenantRequired();
    const { name, unit, cost_per_unit, stock_quantity, low_stock_threshold, category_id, outlet_id } = body;
    if (!name || !unit) return NextResponse.json({ error: "name and unit are required" }, { status: 400 });

    // outlet_id: use provided, or fall back to user's outlet, or first outlet for tenant
    let resolvedOutletId = outlet_id || session.user.outletId || null;
    if (!resolvedOutletId) {
      const outlet = await queryOne<{ id: number }>(
        "SELECT id FROM outlets WHERE tenant_id = $1 ORDER BY id LIMIT 1", [tenantId]
      );
      resolvedOutletId = outlet?.id ?? null;
    }
    if (!resolvedOutletId) return NextResponse.json({ error: "No outlet found for this tenant" }, { status: 400 });

    const row = await queryOne(
      `INSERT INTO ingredients (tenant_id, outlet_id, category_id, name, unit, cost_per_unit, current_stock, reorder_level)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING
         id, name, unit, cost_per_unit,
         current_stock AS stock_quantity,
         reorder_level AS low_stock_threshold,
         outlet_id, category_id, is_active`,
      [tenantId, resolvedOutletId, category_id || null, name, unit,
       parseFloat(String(cost_per_unit || 0)),
       parseFloat(String(stock_quantity || 0)),
       parseFloat(String(low_stock_threshold || 0))]
    );
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    return apiError(error, "ingredients:post");
  }
}
