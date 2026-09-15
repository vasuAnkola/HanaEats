import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import pool from "@/lib/db";

const PLATFORM_TO_ORDER_STATUS: Record<string, string> = {
  accepted: "pending",
  preparing: "preparing",
  ready: "ready",
  picked_up: "served",
  delivered: "closed",
  cancelled: "cancelled",
};

// Legal forward/cancel transitions — prevents an already-delivered order from
// being pushed backward, or a completed order silently reopening.
const LEGAL_PLATFORM_TRANSITIONS: Record<string, string[]> = {
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["picked_up", "cancelled"],
  picked_up: ["delivered"],
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !["super_admin", "admin", "manager", "cashier", "kitchen"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const { platform_status } = await req.json();
  if (!platform_status || !PLATFORM_TO_ORDER_STATUS[platform_status]) {
    return NextResponse.json({ error: "Invalid platform_status" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query(
      `SELECT platform_status FROM delivery_orders WHERE id = $1 AND tenant_id = $2`,
      [id, session.user.tenantId]
    );
    if (!current.rows[0]) throw new Error("Not found");
    const allowedNext = LEGAL_PLATFORM_TRANSITIONS[current.rows[0].platform_status] ?? [];
    if (!allowedNext.includes(platform_status)) {
      throw new Error(`Can't move a delivery order from "${current.rows[0].platform_status}" to "${platform_status}"`);
    }

    const doRes = await client.query(
      `UPDATE delivery_orders SET platform_status = $1 WHERE id = $2 AND tenant_id = $3 RETURNING order_id`,
      [platform_status, id, session.user.tenantId]
    );
    if (!doRes.rows[0]) throw new Error("Not found");

    await client.query(
      `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2`,
      [PLATFORM_TO_ORDER_STATUS[platform_status], doRes.rows[0].order_id]
    );
    await client.query("COMMIT");
  } catch (e: unknown) {
    await client.query("ROLLBACK");
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  } finally {
    client.release();
  }

  const row = await queryOne(`SELECT * FROM delivery_orders WHERE id = $1`, [id]);
  return NextResponse.json(row);
}
