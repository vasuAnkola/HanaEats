import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";

const LOW_MARGIN_THRESHOLD = 30; // %

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const outletId = searchParams.get("outlet_id");
  if (!outletId) return NextResponse.json({ error: "outlet_id required" }, { status: 400 });

  const rows = await query<{ id: number; name: string; price: number; cost: number; category_name: string; units_sold: number }>(
    `SELECT mi.id, mi.name, mi.price, mi.cost, mc.name AS category_name,
            COALESCE(SUM(oi.quantity), 0)::int AS units_sold
     FROM menu_items mi
     JOIN menu_categories mc ON mc.id = mi.category_id
     LEFT JOIN order_items oi ON oi.item_id = mi.id
     LEFT JOIN orders o ON o.id = oi.order_id AND o.status <> 'cancelled'
     WHERE mi.outlet_id = $1 AND mi.tenant_id = $2 AND mi.is_available = true
     GROUP BY mi.id, mi.name, mi.price, mi.cost, mc.name
     ORDER BY mi.price DESC`,
    [outletId, session.user.tenantId]
  );

  const withMargin = rows.map(r => {
    const price = parseFloat(String(r.price));
    const cost = parseFloat(String(r.cost));
    const marginPct = price > 0 ? ((price - cost) / price) * 100 : 0;
    return {
      ...r,
      price,
      cost,
      margin_pct: parseFloat(marginPct.toFixed(1)),
      is_low_margin: cost > 0 && marginPct < LOW_MARGIN_THRESHOLD,
    };
  });

  return NextResponse.json({ items: withMargin, threshold_pct: LOW_MARGIN_THRESHOLD });
}
