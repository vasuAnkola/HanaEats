import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await query(
    `SELECT * FROM vendors WHERE tenant_id = $1 ORDER BY name`,
    [session.user.tenantId]
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId;
  const { name, contact_name, phone, email, address, notes } = await req.json();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const row = await queryOne(
    `INSERT INTO vendors (tenant_id, name, contact_name, phone, email, address, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [tenantId, name, contact_name || null, phone || null, email || null, address || null, notes || null]
  );
  return NextResponse.json(row, { status: 201 });
}
