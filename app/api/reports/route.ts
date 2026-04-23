import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "overview";
  const outletId = searchParams.get("outlet_id");
  const from = searchParams.get("from") ?? new Date(new Date().setDate(1)).toISOString().split("T")[0];
  const to = searchParams.get("to") ?? new Date().toISOString().split("T")[0];

  const outletFilter = outletId ? "AND p.outlet_id = " + parseInt(outletId) : "";
  const outletFilterO = outletId ? "AND o.outlet_id = " + parseInt(outletId) : "";

  if (type === "overview") {
    const [sales, topItems, byOutlet, hourly] = await Promise.all([
      // Daily sales in range
      query(`
        SELECT DATE(p.created_at) AS date,
               COUNT(*)::int AS order_count,
               SUM(p.total_amount)::numeric AS revenue,
               SUM(p.tax_amount)::numeric AS tax,
               SUM(p.discount_amount)::numeric AS discount
        FROM payments p
        WHERE p.tenant_id = $1 AND p.status = 'completed'
          AND DATE(p.created_at) BETWEEN $2 AND $3 ${outletFilter}
        GROUP BY DATE(p.created_at)
        ORDER BY date`, [tenantId, from, to]),

      // Top selling items
      query(`
        SELECT mi.name, SUM(oi.quantity)::int AS qty, SUM(oi.quantity * oi.unit_price)::numeric AS revenue
        FROM order_items oi
        JOIN menu_items mi ON mi.id = oi.menu_item_id
        JOIN orders o ON o.id = oi.order_id
        WHERE o.tenant_id = $1 AND o.status IN ('closed','served')
          AND DATE(o.created_at) BETWEEN $2 AND $3 ${outletFilterO}
        GROUP BY mi.name ORDER BY revenue DESC LIMIT 10`, [tenantId, from, to]),

      // Revenue by outlet
      query(`
        SELECT ol.name AS outlet_name, COUNT(p.id)::int AS order_count,
               SUM(p.total_amount)::numeric AS revenue
        FROM payments p
        JOIN outlets ol ON ol.id = p.outlet_id
        WHERE p.tenant_id = $1 AND p.status = 'completed'
          AND DATE(p.created_at) BETWEEN $2 AND $3
        GROUP BY ol.name ORDER BY revenue DESC`, [tenantId, from, to]),

      // Hourly heatmap
      query(`
        SELECT EXTRACT(HOUR FROM p.created_at)::int AS hour,
               COUNT(*)::int AS order_count,
               SUM(p.total_amount)::numeric AS revenue
        FROM payments p
        WHERE p.tenant_id = $1 AND p.status = 'completed'
          AND DATE(p.created_at) BETWEEN $2 AND $3 ${outletFilter}
        GROUP BY hour ORDER BY hour`, [tenantId, from, to]),
    ]);

    return NextResponse.json({ sales, topItems, byOutlet, hourly });
  }

  if (type === "staff") {
    const rows = await query(`
      SELECT u.name AS staff_name,
             COUNT(DISTINCT p.id)::int AS payment_count,
             SUM(p.total_amount)::numeric AS total_sales,
             AVG(p.total_amount)::numeric AS avg_order
      FROM payments p
      JOIN users u ON u.id = p.created_by
      WHERE p.tenant_id = $1 AND p.status = 'completed'
        AND DATE(p.created_at) BETWEEN $2 AND $3 ${outletFilter}
      GROUP BY u.name ORDER BY total_sales DESC`, [tenantId, from, to]);
    return NextResponse.json(rows);
  }

  if (type === "customers") {
    const [summary, topCustomers] = await Promise.all([
      query(`
        SELECT COUNT(*)::int AS total,
               SUM(CASE WHEN visit_count = 1 THEN 1 ELSE 0 END)::int AS new_customers,
               SUM(CASE WHEN visit_count > 1 THEN 1 ELSE 0 END)::int AS returning_customers,
               AVG(total_spent)::numeric AS avg_spent
        FROM customers WHERE tenant_id = $1`, [tenantId]),
      query(`
        SELECT name, loyalty_points, total_spent, visit_count
        FROM customers WHERE tenant_id = $1
        ORDER BY total_spent DESC LIMIT 10`, [tenantId]),
    ]);
    return NextResponse.json({ summary: summary[0], topCustomers });
  }

  if (type === "inventory") {
    const rows = await query(`
      SELECT i.name, i.unit, i.stock_quantity, i.low_stock_threshold,
             i.cost_per_unit,
             (i.stock_quantity * i.cost_per_unit)::numeric AS stock_value,
             CASE WHEN i.low_stock_threshold > 0 AND i.stock_quantity <= i.low_stock_threshold
                  THEN true ELSE false END AS is_low
      FROM ingredients i
      WHERE i.tenant_id = $1 AND i.is_active = true
      ORDER BY stock_value DESC`, [tenantId]);
    return NextResponse.json(rows);
  }

  return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[reports]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
