import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const outletId = searchParams.get("outlet_id");
  if (!outletId) return NextResponse.json({ error: "outlet_id required" }, { status: 400 });

  const rows = await query(
    `SELECT o.id AS order_id, o.order_number, o.status AS order_status, o.total, o.created_at,
            do_.id AS delivery_order_id, do_.platform_status, do_.external_order_id,
            do_.customer_name, do_.customer_phone, do_.delivery_address,
            dp.platform
     FROM delivery_orders do_
     JOIN orders o ON o.id = do_.order_id
     JOIN delivery_platforms dp ON dp.id = do_.platform_id
     WHERE o.outlet_id = $1 AND o.tenant_id = $2
     ORDER BY o.created_at DESC
     LIMIT 100`,
    [outletId, session.user.tenantId]
  );
  return NextResponse.json(rows);
}
