import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";

interface WeekdayAvg { item_id: number; item_name: string; dow: number; avg_qty: number; sample_days: number; }

// Statistical demand forecast — no external ML model. For each menu item it
// averages historical quantity sold on the same weekday over the last 8 weeks,
// then projects that average onto the matching weekday for the next 7 days.
// Simple, transparent, and good enough to drive staffing/inventory prep calls.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const outletId = searchParams.get("outlet_id");
  if (!outletId) return NextResponse.json({ error: "outlet_id required" }, { status: 400 });

  const rows = await query<WeekdayAvg>(
    `WITH daily AS (
       SELECT oi.item_id, DATE(o.created_at) AS d, SUM(oi.quantity)::int AS qty
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.outlet_id = $1 AND o.tenant_id = $2 AND o.status <> 'cancelled'
         AND o.created_at >= NOW() - INTERVAL '56 days'
       GROUP BY oi.item_id, DATE(o.created_at)
     )
     SELECT mi.id AS item_id, mi.name AS item_name,
            EXTRACT(DOW FROM daily.d)::int AS dow,
            AVG(daily.qty)::numeric AS avg_qty,
            COUNT(*)::int AS sample_days
     FROM daily
     JOIN menu_items mi ON mi.id = daily.item_id
     WHERE mi.is_available = true
     GROUP BY mi.id, mi.name, EXTRACT(DOW FROM daily.d)
     HAVING COUNT(*) >= 1`,
    [outletId, session.user.tenantId]
  );

  // by (item_id, dow)
  const byKey = new Map<string, WeekdayAvg>();
  for (const r of rows) byKey.set(`${r.item_id}-${r.dow}`, r);

  const itemNames = new Map<number, string>();
  for (const r of rows) itemNames.set(r.item_id, r.item_name);

  const days: { date: string; dow: number; total_qty: number; items: { item_id: number; item_name: string; predicted_qty: number }[] }[] = [];

  for (let offset = 0; offset < 7; offset++) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const dow = d.getDay();
    const dateStr = d.toISOString().split("T")[0];

    const items: { item_id: number; item_name: string; predicted_qty: number }[] = [];
    let total = 0;
    for (const [itemId, name] of itemNames) {
      const match = byKey.get(`${itemId}-${dow}`);
      const predicted = match ? Math.round(Number(match.avg_qty)) : 0;
      if (predicted > 0) {
        items.push({ item_id: itemId, item_name: name, predicted_qty: predicted });
        total += predicted;
      }
    }
    items.sort((a, b) => b.predicted_qty - a.predicted_qty);
    days.push({ date: dateStr, dow, total_qty: total, items: items.slice(0, 10) });
  }

  const hasData = rows.length > 0;
  return NextResponse.json({ days, has_data: hasData });
}
