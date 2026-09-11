import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";

// Ranks items by how often they've historically sold in the current hour-of-day
// window, so the POS can surface "popular right now" without any external data.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const outletId = searchParams.get("outlet_id");
  if (!outletId) return NextResponse.json({ error: "outlet_id required" }, { status: 400 });
  const hour = searchParams.get("hour") ? parseInt(searchParams.get("hour")!) : new Date().getHours();

  const rows = await query(
    `SELECT mi.id, mi.name, COUNT(*)::int AS order_count
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN menu_items mi ON mi.id = oi.item_id
     WHERE o.outlet_id = $1 AND o.tenant_id = $2 AND mi.is_available = true
       AND EXTRACT(HOUR FROM o.created_at)::int BETWEEN $3 AND $4
     GROUP BY mi.id, mi.name
     ORDER BY order_count DESC
     LIMIT 8`,
    [outletId, session.user.tenantId, Math.max(0, hour - 1), Math.min(23, hour + 1)]
  );
  return NextResponse.json(rows);
}
