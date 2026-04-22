import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const outletId = searchParams.get("outlet_id");
  if (!outletId) return NextResponse.json({ error: "outlet_id required" }, { status: 400 });

  const rows = await query(
    `SELECT i.*, ic.name as category_name,
      (i.current_stock <= i.reorder_level) as low_stock
     FROM ingredients i
     LEFT JOIN ingredient_categories ic ON ic.id = i.category_id
     WHERE i.outlet_id = $1 AND i.tenant_id = $2 AND i.is_active = true
     ORDER BY i.name`,
    [outletId, session.user.tenantId]
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { outlet_id, category_id, name, unit, cost_per_unit, reorder_level, current_stock } = body;

  if (!outlet_id || !name || !unit) {
    return NextResponse.json({ error: "outlet_id, name, unit required" }, { status: 400 });
  }

  const row = await query(
    `INSERT INTO ingredients (tenant_id, outlet_id, category_id, name, unit, cost_per_unit, reorder_level, current_stock)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      session.user.tenantId, outlet_id, category_id || null, name, unit,
      parseFloat(String(cost_per_unit ?? 0)),
      parseFloat(String(reorder_level ?? 0)),
      parseFloat(String(current_stock ?? 0)),
    ]
  );
  return NextResponse.json(row[0], { status: 201 });
}
