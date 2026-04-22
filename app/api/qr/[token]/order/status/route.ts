import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const qrSession = await queryOne<{ table_id: number }>(
    "SELECT table_id FROM qr_sessions WHERE token = $1 AND is_active = true AND expires_at > NOW()",
    [token]
  );

  if (!qrSession) {
    return NextResponse.json({ error: "Invalid or expired QR code" }, { status: 403 });
  }

  const order = await queryOne<{
    order_number: string;
    status: string;
    items_count: string;
  }>(
    `SELECT o.order_number, o.status, COUNT(oi.id)::text as items_count
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.table_id = $1 AND o.status NOT IN ('closed','cancelled')
     GROUP BY o.id
     ORDER BY o.created_at DESC
     LIMIT 1`,
    [qrSession.table_id]
  );

  if (!order) {
    return NextResponse.json({ order: null });
  }

  return NextResponse.json({
    order_number: order.order_number,
    status: order.status,
    items_count: parseInt(String(order.items_count)),
  });
}
