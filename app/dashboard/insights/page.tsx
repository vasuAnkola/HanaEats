"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type Column } from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { readJson } from "@/lib/api-client";
import { TrendingUp, Flame, AlertTriangle, Sparkles, CloudRain, Sun, Snowflake } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

interface Outlet { id: number; name: string; }

interface ForecastDay { date: string; dow: number; total_qty: number; items: { item_id: number; item_name: string; predicted_qty: number }[]; }
interface ForecastData { days: ForecastDay[]; has_data: boolean; }

interface MarginItem { id: number; name: string; category_name: string; price: number; cost: number; margin_pct: number; units_sold: number; is_low_margin: boolean; }
interface MarginData { items: MarginItem[]; threshold_pct: number; }

interface PopularItem { id: number; name: string; order_count: number; }

interface WeatherData {
  available: boolean;
  condition?: "hot" | "cold" | "rainy" | "mild";
  temperature_c?: number;
  country?: string;
  items?: { id: number; name: string; price: number }[];
}

const fmt = (n: number | string) => "RM " + parseFloat(String(n || 0)).toFixed(2);
const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function InsightsPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outletId, setOutletId] = useState("");
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [margins, setMargins] = useState<MarginData | null>(null);
  const [popular, setPopular] = useState<PopularItem[] | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    fetch("/api/outlets").then(readJson).then(d => {
      const list = Array.isArray(d) ? d : [];
      setOutlets(list);
      if (list.length) setOutletId(String(list[0].id));
    });
  }, []);

  const load = useCallback(async () => {
    if (!outletId) return;
    setForecast(null); setMargins(null); setPopular(null); setWeather(null);
    const [f, m, p, w] = await Promise.all([
      fetch(`/api/insights/forecast?outlet_id=${outletId}`).then(readJson) as Promise<Partial<ForecastData>>,
      fetch(`/api/insights/margins?outlet_id=${outletId}`).then(readJson) as Promise<Partial<MarginData>>,
      fetch(`/api/insights/popular?outlet_id=${outletId}`).then(readJson),
      fetch(`/api/insights/weather?outlet_id=${outletId}`).then(readJson) as Promise<WeatherData>,
    ]);
    setForecast(f?.days ? (f as ForecastData) : { days: [], has_data: false });
    setMargins(m?.items ? (m as MarginData) : { items: [], threshold_pct: 30 });
    setPopular(Array.isArray(p) ? p : []);
    setWeather(w?.available !== undefined ? w : { available: false });
  }, [outletId]);

  useEffect(() => { load(); }, [load]);

  const marginCols: Column<MarginItem>[] = [
    { key: "name", label: "Item", sortable: true, render: r => (
      <div className="flex items-center gap-2">
        {r.is_low_margin && <span title="Low margin"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /></span>}
        <div>
          <p className="text-sm font-medium text-gray-900">{r.name}</p>
          <p className="text-[11px] text-gray-400">{r.category_name}</p>
        </div>
      </div>
    )},
    { key: "price", label: "Price", sortable: true, render: r => fmt(r.price) },
    { key: "cost", label: "Cost", sortable: true, render: r => fmt(r.cost) },
    { key: "margin_pct", label: "Margin", sortable: true, render: r => (
      <span className={`font-semibold ${r.is_low_margin ? "text-amber-600" : "text-emerald-600"}`}>{r.margin_pct}%</span>
    )},
    { key: "units_sold", label: "Units Sold (all time)", sortable: true },
  ];

  const chartData = (forecast?.days ?? []).map(d => ({ label: `${DOW_LABELS[d.dow]} ${d.date.slice(5)}`, qty: d.total_qty }));

  return (
    <div>
      <Header title="AI Insights" subtitle="Demand forecast, upsell trends & margin analysis" />
      <div className="p-6 space-y-6">
        <Select value={outletId} onValueChange={v => v && setOutletId(v)}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Select outlet" /></SelectTrigger>
          <SelectContent>{outlets.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}</SelectContent>
        </Select>

        <Tabs defaultValue="forecast" className="space-y-4">
          <TabsList>
            <TabsTrigger value="forecast">7-Day Forecast</TabsTrigger>
            <TabsTrigger value="popular">Popular Now</TabsTrigger>
            <TabsTrigger value="margins">Margin Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="forecast" className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-brand-orange" />
                <h3 className="text-sm font-semibold text-gray-700">Predicted Orders — Next 7 Days</h3>
              </div>
              {forecast === null ? (
                <div className="h-48 flex items-center justify-center text-sm text-gray-400">Loading...</div>
              ) : !forecast.has_data ? (
                <div className="h-48 flex items-center justify-center text-sm text-gray-400 text-center px-6">
                  Not enough order history yet. The forecast improves as more orders come in over the next few weeks.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip formatter={(v) => [v, "Predicted units"]} />
                    <Bar dataKey="qty" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              <p className="text-[11px] text-gray-400 mt-3">Based on average sales for each weekday over the last 8 weeks.</p>
            </div>

            {forecast?.has_data && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {forecast.days.slice(0, 4).map(d => (
                  <div key={d.date} className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-500">{DOW_LABELS[d.dow]} · {d.date}</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">{d.total_qty} units expected</p>
                    <div className="mt-2 space-y-1">
                      {d.items.slice(0, 3).map(it => (
                        <div key={it.item_id} className="flex justify-between text-xs text-gray-500">
                          <span className="truncate">{it.item_name}</span>
                          <span className="font-medium text-gray-700">{it.predicted_qty}</span>
                        </div>
                      ))}
                      {d.items.length === 0 && <p className="text-xs text-gray-300">No forecast data</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="popular">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Flame className="w-4 h-4 text-orange-500" />
                <h3 className="text-sm font-semibold text-gray-700">Popular Around This Time of Day</h3>
              </div>
              {popular === null ? (
                <div className="h-32 flex items-center justify-center text-sm text-gray-400">Loading...</div>
              ) : popular.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-sm text-gray-400">No sales history for this time window yet.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {popular.map((p, i) => (
                    <div key={p.id} className="border border-gray-100 rounded-lg p-3 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-orange-50 text-orange-600 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                        <p className="text-[11px] text-gray-400">{p.order_count} orders</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-gray-400 mt-3 flex items-center gap-1"><Sparkles className="w-3 h-3" /> These also show as suggestions inside POS while taking an order.</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 mt-4">
              <div className="flex items-center gap-2 mb-4">
                {weather?.condition === "hot" ? <Sun className="w-4 h-4 text-amber-500" /> : weather?.condition === "cold" ? <Snowflake className="w-4 h-4 text-brand-light" /> : weather?.condition === "rainy" ? <CloudRain className="w-4 h-4 text-slate-500" /> : <CloudRain className="w-4 h-4 text-gray-300" />}
                <h3 className="text-sm font-semibold text-gray-700">Weather Right Now</h3>
              </div>
              {weather === null ? (
                <div className="h-20 flex items-center justify-center text-sm text-gray-400">Loading...</div>
              ) : !weather.available ? (
                <div className="h-20 flex items-center justify-center text-sm text-gray-400 text-center px-6">No location set for this outlet — add coordinates to enable weather-based suggestions.</div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-3">
                    <span className="font-semibold text-gray-900">{weather.temperature_c}°C</span> and {weather.condition === "hot" ? "hot" : weather.condition === "cold" ? "cool" : weather.condition === "rainy" ? "rainy" : "mild"} near {weather.country}.
                  </p>
                  {weather.condition === "mild" ? (
                    <p className="text-xs text-gray-400">No specific suggestion for mild weather.</p>
                  ) : weather.items && weather.items.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {weather.items.map(it => (
                        <div key={it.id} className="border border-gray-100 rounded-lg px-3 py-2 text-sm">
                          <p className="font-medium text-gray-800 truncate">{it.name}</p>
                          <p className="text-[11px] text-gray-400">{fmt(it.price)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">No items tagged for this weather yet — tag a menu item under Menu → item → Weather Suggestion.</p>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="margins">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">Cost vs. Selling Price</h3>
                {margins && <span className="text-[11px] text-gray-400">Flagged when margin is below {margins.threshold_pct}%</span>}
              </div>
              {margins === null ? <TableSkeleton rows={8} cols={5} /> : (
                <DataTable data={margins.items} columns={marginCols} searchKeys={["name"]} searchPlaceholder="Search menu items..." pageSize={25} emptyMessage="No menu items with cost data yet." />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
