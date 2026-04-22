import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const outletId = searchParams.get("outlet_id");
  const date = searchParams.get("date");
  const status = searchParams.get("status");
  const tenantId = session.user.tenantId;

  let sql = "SELECT r.*, t.table_number FROM reservations r LEFT JOIN outlet_tables t ON t.id = r.table_id WHERE r.tenant_id = $1";
  const params: (string | number)[] = [tenantId!];
  let idx = 2;

  if (outletId) { sql += ` AND r.outlet_id = $${idx++}`; params.push(outletId); }
  if (date) { sql += ` AND r.reservation_date = $${idx++}`; params.push(date); }
  if (status && status !== "all") { sql += ` AND r.status = $${idx++}`; params.push(status); }
  sql += " ORDER BY r.reservation_date DESC, r.reservation_time DESC";

  const reservations = await query(sql, params);
  return NextResponse.json(reservations);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    outlet_id, customer_name, customer_email, customer_phone,
    party_size, reservation_date, reservation_time, table_id, special_requests,
  } = body;

  if (!outlet_id || !customer_name || !reservation_date || !reservation_time) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const reservation_number = "RES-" + Date.now().toString(36).toUpperCase();
  const tenantId = session.user.tenantId;

  const reservation = await queryOne(
    `INSERT INTO reservations
      (tenant_id, outlet_id, reservation_number, customer_name, customer_email,
       customer_phone, party_size, reservation_date, reservation_time, table_id, special_requests)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [
      tenantId, outlet_id, reservation_number, customer_name,
      customer_email || null, customer_phone || null, party_size || 2,
      reservation_date, reservation_time, table_id || null, special_requests || null,
    ]
  );

  return NextResponse.json(reservation, { status: 201 });
}
