import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await query(
    `SELECT * FROM vendors WHERE tenant_id = $1 AND is_active = true ORDER BY name`,
    [session.user.tenantId]
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, contact_name, phone, email, address, lead_time_days } = body;

  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const row = await query(
    `INSERT INTO vendors (tenant_id, name, contact_name, phone, email, address, lead_time_days)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      session.user.tenantId, name,
      contact_name || null, phone || null, email || null,
      address || null, lead_time_days ?? 1,
    ]
  );
  return NextResponse.json(row[0], { status: 201 });
}
