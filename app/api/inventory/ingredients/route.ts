import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId;
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("category_id");

  const rows = await query(
    `SELECT i.*, ic.name AS category_name
     FROM ingredients i
     LEFT JOIN ingredient_categories ic ON ic.id = i.category_id
     WHERE i.tenant_id = $1 ${categoryId ? "AND i.category_id = $2" : ""}
     ORDER BY i.name`,
    categoryId ? [tenantId, categoryId] : [tenantId]
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId;
  const body = await req.json();
  const { name, unit, cost_per_unit, stock_quantity, low_stock_threshold, category_id } = body;
  if (!name || !unit) return NextResponse.json({ error: "name and unit are required" }, { status: 400 });

  const row = await queryOne(
    `INSERT INTO ingredients (tenant_id, category_id, name, unit, cost_per_unit, stock_quantity, low_stock_threshold)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [tenantId, category_id || null, name, unit,
     parseFloat(String(cost_per_unit || 0)),
     parseFloat(String(stock_quantity || 0)),
     parseFloat(String(low_stock_threshold || 0))]
  );
  return NextResponse.json(row, { status: 201 });
}
