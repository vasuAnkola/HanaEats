"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type Column } from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Download, TrendingUp, ShoppingCart, Users, Package } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Cell,
} from "recharts";

// ── Types ────────────────────────────────────────────────────────────────────

interface SalesRow { date: string; order_count: number; revenue: number; tax: number; discount: number; }
interface TopItem  { name: string; qty: number; revenue: number; }
interface OutletRow { outlet_name: string; order_count: number; revenue: number; }
interface HourRow  { hour: number; order_count: number; revenue: number; }
interface OverviewData { sales: SalesRow[]; topItems: TopItem[]; byOutlet: OutletRow[]; hourly: HourRow[]; }

interface StaffRow { staff_name: string; payment_count: number; total_sales: number; avg_order: number; }

interface CustomerSummary { total: number; new_customers: number; returning_customers: number; avg_spent: number; }
interface TopCustomer { name: string; loyalty_points: number; total_spent: number; visit_count: number; }
interface CustomerData { summary: CustomerSummary; topCustomers: TopCustomer[]; }

interface InvRow { name: string; unit: string; stock_quantity: number; low_stock_threshold: number; cost_per_unit: number; stock_value: number; is_low: boolean; }

interface Outlet { id: number; name: string; }

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number | string) => "RM " + parseFloat(String(n || 0)).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const today = () => new Date().toISOString().split("T")[0];
const monthStart = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
const weekStart = () => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d.toISOString().split("T")[0]; };

function downloadCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = filename;
  a.click();
}

const HEATMAP_COLORS = ["#f0f9ff","#bae6fd","#7dd3fc","#38bdf8","#0284c7","#075985"];
function heatColor(val: number, max: number) {
  if (max === 0) return HEATMAP_COLORS[0];
  const idx = Math.min(5, Math.floor((val / max) * 6));
  return HEATMAP_COLORS[idx];
}

const HOUR_LABELS = ["12a","1a","2a","3a","4a","5a","6a","7a","8a","9a","10a","11a",
                     "12p","1p","2p","3p","4p","5p","6p","7p","8p","9p","10p","11p"];

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outletId, setOutletId] = useState("all");
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [loading, setLoading] = useState(false);

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [staff, setStaff] = useState<StaffRow[] | null>(null);
  const [customers, setCustomers] = useState<CustomerData | null>(null);
  const [inventory, setInventory] = useState<InvRow[] | null>(null);

  useEffect(() => {
    fetch("/api/outlets").then(r => r.json()).then(d => setOutlets(Array.isArray(d) ? d : []));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const base = `?from=${from}&to=${to}` + (outletId !== "all" ? `&outlet_id=${outletId}` : "");
    const [ov, st, cu, inv] = await Promise.all([
      fetch(`/api/reports${base}&type=overview`).then(r => r.json()),
      fetch(`/api/reports${base}&type=staff`).then(r => r.json()),
      fetch(`/api/reports${base}&type=customers`).then(r => r.json()),
      fetch(`/api/reports${base}&type=inventory`).then(r => r.json()),
    ]);
    setOverview(ov);
    setStaff(Array.isArray(st) ? st : []);
    setCustomers(cu.summary ? cu : null);
    setInventory(Array.isArray(inv) ? inv : []);
    setLoading(false);
  }, [from, to, outletId]);

  useEffect(() => { load(); }, [load]);

  // KPIs from overview.sales
  const totalRevenue = overview?.sales.reduce((s, r) => s + parseFloat(String(r.revenue || 0)), 0) ?? 0;
  const totalOrders  = overview?.sales.reduce((s, r) => s + (r.order_count || 0), 0) ?? 0;
  const totalTax     = overview?.sales.reduce((s, r) => s + parseFloat(String(r.tax || 0)), 0) ?? 0;
  const avgOrder     = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const maxHourly = Math.max(...(overview?.hourly.map(h => h.order_count) ?? [0]));
  const hourlyMap: Record<number, HourRow> = {};
  overview?.hourly.forEach(h => { hourlyMap[h.hour] = h; });

  // Columns
  const staffCols: Column<StaffRow>[] = [
    { key: "staff_name", label: "Staff", sortable: true },
    { key: "payment_count", label: "Transactions", sortable: true },
    { key: "total_sales", label: "Total Sales", sortable: true, render: r => <span className="font-semibold text-indigo-700">{fmt(r.total_sales)}</span> },
    { key: "avg_order", label: "Avg Order", render: r => <span className="text-gray-500">{fmt(r.avg_order)}</span> },
  ];

  const custCols: Column<TopCustomer>[] = [
    { key: "name", label: "Customer", sortable: true },
    { key: "visit_count", label: "Visits", sortable: true },
    { key: "loyalty_points", label: "Points", sortable: true, render: r => <span className="text-amber-600 font-medium">{r.loyalty_points}</span> },
    { key: "total_spent", label: "Total Spent", sortable: true, render: r => <span className="font-semibold text-indigo-700">{fmt(r.total_spent)}</span> },
  ];

  const invCols: Column<InvRow>[] = [
    { key: "name", label: "Ingredient", sortable: true, render: r => (
      <div className="flex items-center gap-2">
        {r.is_low && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full uppercase">Low</span>}
        <span>{r.name}</span>
      </div>
    )},
    { key: "unit", label: "Unit" },
    { key: "stock_quantity", label: "Stock", sortable: true, render: r => parseFloat(String(r.stock_quantity)).toFixed(2) },
    { key: "cost_per_unit", label: "Cost/Unit", render: r => fmt(r.cost_per_unit) },
    { key: "stock_value", label: "Stock Value", sortable: true, render: r => <span className="font-semibold text-gray-800">{fmt(r.stock_value)}</span> },
  ];

  return (
    <div>
      <Header title="Reports" subtitle="Analytics and performance insights" />
      <div className="p-6 space-y-6">

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 bg-white border border-gray-200 rounded-xl p-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Outlet</label>
            <Select value={outletId} onValueChange={v => v && setOutletId(v)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outlets</SelectItem>
                {outlets.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">From</label>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-36" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">To</label>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-36" />
          </div>
          <div className="flex gap-2 pb-0.5">
            <Button variant="outline" size="sm" onClick={() => { setFrom(today()); setTo(today()); }}>Today</Button>
            <Button variant="outline" size="sm" onClick={() => { setFrom(weekStart()); setTo(today()); }}>This Week</Button>
            <Button variant="outline" size="sm" onClick={() => { setFrom(monthStart()); setTo(today()); }}>This Month</Button>
          </div>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-indigo-500 mb-1" />}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Revenue" value={fmt(totalRevenue)} icon={TrendingUp} color="bg-indigo-50 text-indigo-600" />
          <StatCard label="Total Orders" value={String(totalOrders)} icon={ShoppingCart} color="bg-emerald-50 text-emerald-600" />
          <StatCard label="Avg Order Value" value={fmt(avgOrder)} icon={TrendingUp} color="bg-amber-50 text-amber-600" />
          <StatCard label="Tax Collected" value={fmt(totalTax)} icon={Package} color="bg-blue-50 text-blue-600" />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
          </TabsList>

          {/* ── Overview ── */}
          <TabsContent value="overview" className="space-y-6">
            {/* Daily Revenue Chart */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">Daily Revenue</h3>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                  onClick={() => overview && downloadCSV(overview.sales as unknown as Record<string, unknown>[], "daily-revenue.csv")}>
                  <Download className="w-3.5 h-3.5" /> Export
                </Button>
              </div>
              {overview === null ? (
                <div className="h-48 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
              ) : overview.sales.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-sm text-gray-400">No data for this period.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={overview.sales} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => "RM" + (v/1000).toFixed(0) + "k"} />
                    <Tooltip formatter={(v) => [fmt(Number(v ?? 0)), "Revenue"]} labelFormatter={d => new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })} />
                    <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Top Items + By Outlet */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Items */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-700">Top Selling Items</h3>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                    onClick={() => overview && downloadCSV(overview.topItems as unknown as Record<string, unknown>[], "top-items.csv")}>
                    <Download className="w-3.5 h-3.5" /> Export
                  </Button>
                </div>
                {overview === null ? (
                  <div className="h-48 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
                ) : overview.topItems.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-sm text-gray-400">No data.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={overview.topItems} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 80 }}>
                      <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => "RM" + v.toFixed(0)} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={75} />
                      <Tooltip formatter={(v) => [fmt(Number(v ?? 0)), "Revenue"]} />
                      <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                        {overview.topItems.map((_, i) => <Cell key={i} fill={i === 0 ? "#6366f1" : i < 3 ? "#818cf8" : "#c7d2fe"} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* By Outlet */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue by Outlet</h3>
                {overview === null ? (
                  <div className="h-48 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
                ) : overview.byOutlet.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-sm text-gray-400">No data.</div>
                ) : (
                  <div className="space-y-3">
                    {overview.byOutlet.map((o, i) => {
                      const maxRev = Math.max(...overview.byOutlet.map(x => parseFloat(String(x.revenue))));
                      const pct = maxRev > 0 ? (parseFloat(String(o.revenue)) / maxRev) * 100 : 0;
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="font-medium text-gray-700">{o.outlet_name}</span>
                            <span className="text-indigo-700 font-semibold">{fmt(o.revenue)}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{o.order_count} orders</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Hourly Heatmap */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Hourly Order Heatmap</h3>
              {overview === null ? (
                <div className="h-16 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
              ) : (
                <div className="flex gap-1 flex-wrap">
                  {HOUR_LABELS.map((label, h) => {
                    const row = hourlyMap[h];
                    const count = row?.order_count ?? 0;
                    return (
                      <div key={h} className="flex flex-col items-center gap-1" title={`${label}: ${count} orders`}>
                        <div className="w-9 h-9 rounded-md border border-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-700"
                          style={{ backgroundColor: heatColor(count, maxHourly) }}>
                          {count > 0 ? count : ""}
                        </div>
                        <span className="text-[9px] text-gray-400">{label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Staff ── */}
          <TabsContent value="staff">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">Staff Performance</h3>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                  onClick={() => staff && downloadCSV(staff as unknown as Record<string, unknown>[], "staff-performance.csv")}>
                  <Download className="w-3.5 h-3.5" /> Export
                </Button>
              </div>
              {staff === null ? <TableSkeleton rows={6} cols={4} /> : (
                <DataTable data={staff} columns={staffCols} searchKeys={["staff_name"]} searchPlaceholder="Search staff..." pageSize={20} emptyMessage="No data for this period." />
              )}
            </div>
          </TabsContent>

          {/* ── Customers ── */}
          <TabsContent value="customers" className="space-y-6">
            {customers && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Customers" value={String(customers.summary.total)} icon={Users} color="bg-indigo-50 text-indigo-600" />
                <StatCard label="New Customers" value={String(customers.summary.new_customers)} icon={Users} color="bg-emerald-50 text-emerald-600" />
                <StatCard label="Returning" value={String(customers.summary.returning_customers)} icon={Users} color="bg-amber-50 text-amber-600" />
                <StatCard label="Avg Spent" value={fmt(customers.summary.avg_spent)} icon={TrendingUp} color="bg-blue-50 text-blue-600" />
              </div>
            )}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">Top Customers</h3>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                  onClick={() => customers && downloadCSV(customers.topCustomers as unknown as Record<string, unknown>[], "top-customers.csv")}>
                  <Download className="w-3.5 h-3.5" /> Export
                </Button>
              </div>
              {customers === null ? <TableSkeleton rows={6} cols={4} /> : (
                <DataTable data={customers.topCustomers} columns={custCols} searchKeys={["name"]} searchPlaceholder="Search customers..." pageSize={10} emptyMessage="No customer data." />
              )}
            </div>
          </TabsContent>

          {/* ── Inventory ── */}
          <TabsContent value="inventory">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">Inventory Value</h3>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                  onClick={() => inventory && downloadCSV(inventory as unknown as Record<string, unknown>[], "inventory-value.csv")}>
                  <Download className="w-3.5 h-3.5" /> Export
                </Button>
              </div>
              {inventory === null ? <TableSkeleton rows={8} cols={5} /> : (
                <DataTable data={inventory} columns={invCols} searchKeys={["name"]} searchPlaceholder="Search ingredients..." pageSize={25} emptyMessage="No inventory data." />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}