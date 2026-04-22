import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const outlet_id = searchParams.get("outlet_id");
  const status = searchParams.get("status");

  if (!outlet_id) return NextResponse.json({ error: "outlet_id required" }, { status: 400 });

  let sql = `
    SELECT ss.*, u.name as cashier_name
    FROM shift_sessions ss
    JOIN users u ON u.id = ss.cashier_id
    WHERE ss.outlet_id = $1 AND ss.tenant_id = $2
  `;
  const params: unknown[] = [outlet_id, session.user.tenantId];

  if (status) {
    params.push(status);
    sql += ` AND ss.status = $${params.length}`;
  }

  sql += ` ORDER BY ss.opening_at DESC LIMIT 50`;

  const rows = await query(sql, params);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { outlet_id, opening_float = 0 } = body;

  if (!outlet_id) return NextResponse.json({ error: "outlet_id required" }, { status: 400 });

  // Check no existing open shift for this cashier at this outlet
  const existing = await queryOne(
    `SELECT id FROM shift_sessions WHERE outlet_id=$1 AND cashier_id=$2 AND status='open'`,
    [outlet_id, session.user.id]
  );
  if (existing) return NextResponse.json({ error: "You already have an open shift" }, { status: 409 });

  const row = await queryOne(
    `INSERT INTO shift_sessions (outlet_id, tenant_id, cashier_id, opening_float)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [outlet_id, session.user.tenantId, session.user.id, opening_float]
  );
  return NextResponse.json(row, { status: 201 });
}
