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
    const rows = await query(
      `SELECT * FROM vendors WHERE tenant_id = $1 ORDER BY name`,
      [tenantId]
    );
    return NextResponse.json(rows);
  } catch (error) {
    return apiError(error, "vendors:get");
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const tenantId = getTenantId(session, body);
    if (!tenantId) return tenantRequired();
    const { name, contact_name, phone, email, address, notes } = body;
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    const row = await queryOne(
      `INSERT INTO vendors (tenant_id, name, contact_name, phone, email, address, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [tenantId, name, contact_name || null, phone || null, email || null, address || null, notes || null]
    );
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    return apiError(error, "vendors:post");
  }
}
