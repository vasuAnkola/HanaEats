import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";

// "Frequently bought together" — looks at past orders that contained the given
// item and ranks what else typically rode along with it. No external AI model;
// it's a co-occurrence count over order history, which is what actually predicts
// upsell behaviour for a single outlet's real customers.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const outletId = searchParams.get("outlet_id");
  const itemId = searchParams.get("item_id");
  if (!outletId || !itemId) return NextResponse.json({ error: "outlet_id and item_id required" }, { status: 400 });

  const rows = await query(
    `SELECT mi.id, mi.name, mi.price, COUNT(*)::int AS times_together
     FROM order_items oi1
     JOIN order_items oi2 ON oi2.order_id = oi1.order_id AND oi2.item_id IS DISTINCT FROM oi1.item_id
     JOIN orders o ON o.id = oi1.order_id
     JOIN menu_items mi ON mi.id = oi2.item_id
     WHERE oi1.item_id = $1 AND o.outlet_id = $2 AND o.tenant_id = $3
       AND mi.is_available = true
     GROUP BY mi.id, mi.name, mi.price
     ORDER BY times_together DESC
     LIMIT 5`,
    [itemId, outletId, session.user.tenantId]
  );
  return NextResponse.json(rows);
}
