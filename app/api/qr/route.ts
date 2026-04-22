import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import crypto from "node:crypto";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { table_id, outlet_id } = body;

  if (!table_id || !outlet_id) {
    return NextResponse.json({ error: "table_id and outlet_id required" }, { status: 400 });
  }

  const tenantId = session.user.tenantId;

  // Deactivate existing active QR for this table
  await query(
    "UPDATE qr_sessions SET is_active = false WHERE table_id = $1 AND is_active = true",
    [table_id]
  );

  const token = crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await queryOne(
    `INSERT INTO qr_sessions (tenant_id, outlet_id, table_id, token, expires_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [tenantId, outlet_id, table_id, token, expiresAt]
  );

  return NextResponse.json({
    token,
    qr_url: `/qr/${token}`,
    expires_at: expiresAt,
  });
}
