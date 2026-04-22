import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { z } from "zod";

const Schema = z.object({
  status: z.enum(["pending", "preparing", "ready", "served", "closed", "cancelled"]),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const order = await queryOne(
    `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [parsed.data.status, id]
  ) as Record<string, unknown> | null;

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Free table when order closed/cancelled
  if (["closed", "cancelled"].includes(parsed.data.status) && order.table_id) {
    await queryOne("UPDATE outlet_tables SET status = 'available' WHERE id = $1", [order.table_id]);
  }

  return NextResponse.json(order);
}
