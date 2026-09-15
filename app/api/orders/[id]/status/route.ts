import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { z } from "zod";

const Schema = z.object({
  status: z.enum(["pending", "preparing", "ready", "served", "closed", "cancelled"]),
});

// The reverse of delivery/orders/[id]/status's PLATFORM_TO_ORDER_STATUS map — keeps
// the delivery dashboard's platform_status in sync when kitchen advances an order
// through the normal (order-type-agnostic) KDS flow instead of the delivery page.
const ORDER_TO_PLATFORM_STATUS: Record<string, string> = {
  pending: "accepted",
  preparing: "preparing",
  ready: "ready",
  served: "picked_up",
  closed: "delivered",
  cancelled: "cancelled",
};

// Legal forward/cancel transitions through this endpoint. "closed" is set
// exclusively by the payments route on successful checkout — it is never a
// valid target here, and every other transition must follow the KDS flow in
// order (no skipping straight from pending to ready/served, no moving a
// served/closed/cancelled order backward).
const LEGAL_TRANSITIONS: Record<string, string[]> = {
  pending: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["served", "cancelled"],
};

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || !["super_admin", "admin", "manager", "cashier", "waiter", "kitchen"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const current = await queryOne<{ status: string }>(
    `SELECT status FROM orders WHERE id = $1 AND tenant_id = $2`,
    [id, session.user.tenantId]
  );
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowedNext = LEGAL_TRANSITIONS[current.status] ?? [];
  if (!allowedNext.includes(parsed.data.status)) {
    return NextResponse.json({ error: `Can't move an order from "${current.status}" to "${parsed.data.status}"` }, { status: 400 });
  }

  const order = await queryOne(
    `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3 RETURNING *`,
    [parsed.data.status, id, session.user.tenantId]
  ) as Record<string, unknown> | null;

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Free table when order closed/cancelled
  if (["closed", "cancelled"].includes(parsed.data.status) && order.table_id) {
    await queryOne("UPDATE outlet_tables SET status = 'available' WHERE id = $1", [order.table_id]);
  }

  // If this is a delivery order, mirror the status into delivery_orders so the
  // Delivery dashboard doesn't show a stale platform_status.
  const platformStatus = ORDER_TO_PLATFORM_STATUS[parsed.data.status];
  if (platformStatus) {
    await queryOne(
      `UPDATE delivery_orders SET platform_status = $1 WHERE order_id = $2 AND tenant_id = $3`,
      [platformStatus, id, session.user.tenantId]
    );
  }

  return NextResponse.json(order);
}
