import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const row = await queryOne(
    `SELECT i.*, ic.name as category_name
     FROM ingredients i
     LEFT JOIN ingredient_categories ic ON ic.id = i.category_id
     WHERE i.id = $1 AND i.tenant_id = $2`,
    [id, session.user.tenantId]
  );
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json();
  const { name, unit, cost_per_unit, reorder_level, current_stock, category_id } = body;

  const row = await queryOne(
    `UPDATE ingredients SET
      name = COALESCE($1, name),
      unit = COALESCE($2, unit),
      cost_per_unit = COALESCE($3, cost_per_unit),
      reorder_level = COALESCE($4, reorder_level),
      current_stock = COALESCE($5, current_stock),
      category_id = COALESCE($6, category_id),
      updated_at = NOW()
     WHERE id = $7 AND tenant_id = $8 RETURNING *`,
    [
      name ?? null, unit ?? null,
      cost_per_unit != null ? parseFloat(String(cost_per_unit)) : null,
      reorder_level != null ? parseFloat(String(reorder_level)) : null,
      current_stock != null ? parseFloat(String(current_stock)) : null,
      category_id ?? null,
      id, session.user.tenantId,
    ]
  );
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  await query(
    `UPDATE ingredients SET is_active = false WHERE id = $1 AND tenant_id = $2`,
    [id, session.user.tenantId]
  );
  return NextResponse.json({ ok: true });
}
