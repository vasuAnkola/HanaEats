import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const reservation = await queryOne(
    `SELECT r.*, t.table_number FROM reservations r
     LEFT JOIN outlet_tables t ON t.id = r.table_id
     WHERE r.id = $1 AND r.tenant_id = $2`,
    [id, session.user.tenantId]
  );

  if (!reservation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(reservation);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { status, notes } = body;

  const reservation = await queryOne<{ id: number; table_id: number | null; status: string }>(
    "SELECT * FROM reservations WHERE id = $1 AND tenant_id = $2",
    [id, session.user.tenantId]
  );
  if (!reservation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await queryOne(
    "UPDATE reservations SET status = COALESCE($1, status), notes = COALESCE($2, notes) WHERE id = $3 RETURNING *",
    [status || null, notes || null, id]
  );

  // Update table status based on reservation status
  if (reservation.table_id) {
    if (status === "seated") {
      await query("UPDATE outlet_tables SET status = 'occupied' WHERE id = $1", [reservation.table_id]);
    } else if (status === "completed" || status === "cancelled") {
      await query("UPDATE outlet_tables SET status = 'available' WHERE id = $1", [reservation.table_id]);
    }
  }

  return NextResponse.json(updated);
}
