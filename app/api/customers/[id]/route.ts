import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const customer = await query(
    "SELECT * FROM customers WHERE id = $1 AND tenant_id = $2",
    [id, session.user.tenantId]
  );
  if (!customer[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const transactions = await query(
    "SELECT * FROM loyalty_transactions WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 10",
    [id]
  );

  return NextResponse.json({ ...customer[0], transactions });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json();
  const { action, points, notes, name, email, phone, is_active } = body;

  if (action === "add_points" || action === "deduct_points") {
    if (!points || points <= 0) return NextResponse.json({ error: "points must be positive" }, { status: 400 });
    const customer = await query(
      "SELECT loyalty_points FROM customers WHERE id = $1 AND tenant_id = $2",
      [id, session.user.tenantId]
    );
    if (!customer[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const current = parseInt(String(customer[0].loyalty_points));
    const delta = action === "add_points" ? parseInt(String(points)) : -parseInt(String(points));
    const newBalance = Math.max(0, current + delta);
    const txType = action === "add_points" ? "manual_add" : "manual_deduct";
    await query(
      "UPDATE customers SET loyalty_points = $1 WHERE id = $2 AND tenant_id = $3",
      [newBalance, id, session.user.tenantId]
    );
    const tx = await query(
      "INSERT INTO loyalty_transactions (tenant_id, customer_id, type, points, balance_after, notes, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [session.user.tenantId, id, txType, Math.abs(parseInt(String(points))), newBalance, notes || null, session.user.id]
    );
    return NextResponse.json(tx[0]);
  }

  const fields: string[] = [];
  const vals: unknown[] = [];
  if (name !== undefined) { vals.push(name); fields.push("name = $" + vals.length); }
  if (email !== undefined) { vals.push(email); fields.push("email = $" + vals.length); }
  if (phone !== undefined) { vals.push(phone); fields.push("phone = $" + vals.length); }
  if (notes !== undefined) { vals.push(notes); fields.push("notes = $" + vals.length); }
  if (is_active !== undefined) { vals.push(is_active); fields.push("is_active = $" + vals.length); }
  if (!fields.length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  vals.push(id, session.user.tenantId);
  const rows = await query(
    "UPDATE customers SET " + fields.join(", ") + " WHERE id = $" + (vals.length - 1) + " AND tenant_id = $" + vals.length + " RETURNING *",
    vals
  );
  return NextResponse.json(rows[0]);
}