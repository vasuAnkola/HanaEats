import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");

  let sql = "SELECT * FROM customers WHERE tenant_id = $1";
  const params: unknown[] = [session.user.tenantId];

  if (search) {
    params.push(`%${search}%`);
    const n = params.length;
    sql += ` AND (name ILIKE $${n} OR email ILIKE $${n} OR phone ILIKE $${n})`;
  }

  sql += " ORDER BY name ASC";

  const rows = await query(sql, params);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, email, phone, preferred_language, notes } = body;

  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const rows = await query(
    "INSERT INTO customers (tenant_id, name, email, phone, preferred_language, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
    [session.user.tenantId, name, email || null, phone || null, preferred_language || "en", notes || null]
  );
  return NextResponse.json(rows[0], { status: 201 });
}
