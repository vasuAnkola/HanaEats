import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId;
  const { searchParams } = new URL(req.url);
  const ingredientId = searchParams.get("ingredient_id");

  const rows = await query(
    `SELECT sm.*, i.name AS ingredient_name, i.unit, u.name AS created_by_name
     FROM stock_movements sm
     JOIN ingredients i ON i.id = sm.ingredient_id
     LEFT JOIN users u ON u.id = sm.created_by
     WHERE sm.tenant_id = $1 ${ingredientId ? "AND sm.ingredient_id = $2" : ""}
     ORDER BY sm.created_at DESC LIMIT 200`,
    ingredientId ? [tenantId, ingredientId] : [tenantId]
  );
  return NextResponse.json(rows);
}
