"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, Clock, CheckCircle, ChefHat } from "lucide-react";

interface Outlet { id: number; name: string; }
interface OrderItem { id: number; item_name: string; quantity: number; note: string | null; variants: { variant_name: string; option_name: string }[] | null; }
interface KDSOrder {
  id: number; order_number: string; order_type: string; status: string;
  table_number: string | null; customer_name: string | null;
  created_at: string; items: OrderItem[];
}

const STATUS_COLOR: Record<string, string> = {
  pending:   "border-amber-400 bg-amber-50",
  preparing: "border-blue-400 bg-blue-50",
  ready:     "border-emerald-400 bg-emerald-50",
};

const STATUS_NEXT: Record<string, string> = {
  pending: "preparing",
  preparing: "ready",
};

function elapsed(created: string) {
  const diff = Math.floor((Date.now() - new Date(created).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  return `${Math.floor(diff / 60)}m ${diff % 60}s`;
}

export default function KDSPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outletId, setOutletId] = useState("");
  const [orders, setOrders] = useState<KDSOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/outlets").then(r => r.json()).then(d => {
      const list = Array.isArray(d) ? d : [];
      setOutlets(list);
      if (list.length) setOutletId(String(list[0].id));
    });
  }, []);

  // Tick every second to update elapsed timers
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    if (!outletId) return;
    const res = await fetch(`/api/orders?outlet_id=${outletId}&status=pending&limit=100`);
    const pendingData = await res.json();
    const res2 = await fetch(`/api/orders?outlet_id=${outletId}&status=preparing&limit=100`);
    const preparingData = await res2.json();
    const res3 = await fetch(`/api/orders?outlet_id=${outletId}&status=ready&limit=100`);
    const readyData = await res3.json();

    const allOrders = [
      ...(Array.isArray(pendingData) ? pendingData : []),
      ...(Array.isArray(preparingData) ? preparingData : []),
      ...(Array.isArray(readyData) ? readyData : []),
    ];

    // Fetch items for each order
    const detailed = await Promise.all(
      allOrders.map(async (o) => {
        const r = await fetch(`/api/orders/${o.id}`);
        const d = await r.json();
        return { ...o, items: d.items ?? [] };
      })
    );
    setOrders(detailed);
    setLoading(false);
  }, [outletId]);

  useEffect(() => {
    if (!outletId) return;
    setLoading(true);
    load();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(load, 15000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [outletId, load]);

  async function advance(id: number, nextStatus: string) {
    setUpdating(id);
    await fetch(`/api/orders/${id}/status`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    setUpdating(null);
    await load();
  }

  const pending   = orders.filter(o => o.status === "pending");
  const preparing = orders.filter(o => o.status === "preparing");
  const ready     = orders.filter(o => o.status === "ready");

  const col = (title: string, color: string, badge: string, list: KDSOrder[], nextStatus?: string, btnLabel?: string) => (
    <div className="flex-1 min-w-0">
      <div className={`flex items-center gap-2 mb-3 px-1`}>
        <span className={`w-2 h-2 rounded-full ${color}`} />
        <p className="font-semibold text-gray-800 text-sm">{title}</p>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge}`}>{list.length}</span>
      </div>
      <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-220px)]">
        {list.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">No orders</div>
        ) : list.map(order => (
          <div key={order.id} className={`border-2 rounded-xl p-3 transition-all ${STATUS_COLOR[order.status]}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-mono font-bold text-gray-900">{order.order_number}</p>
                <p className="text-xs text-gray-500">
                  {order.table_number ? `Table ${order.table_number}` : order.customer_name ?? order.order_type}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500 bg-white/70 rounded-full px-2 py-0.5">
                <Clock className="w-3 h-3" />
                {elapsed(order.created_at)}
              </div>
            </div>
            <div className="space-y-1.5 mb-3">
              {order.items?.map(item => (
                <div key={item.id} className="bg-white/60 rounded-lg px-2.5 py-1.5">
                  <p className="text-sm font-semibold text-gray-900">{item.quantity}× {item.item_name}</p>
                  {item.variants?.map((v, i) => <p key={i} className="text-[10px] text-gray-500">{v.variant_name}: {v.option_name}</p>)}
                  {item.note && <p className="text-[10px] text-amber-700 italic">⚠ {item.note}</p>}
                </div>
              ))}
            </div>
            {nextStatus && (
              <Button size="sm" className="w-full h-8 text-xs font-semibold bg-gray-900 hover:bg-gray-800 text-white"
                onClick={() => advance(order.id, nextStatus)} disabled={updating === order.id}>
                {updating === order.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                {btnLabel}
              </Button>
            )}
            {order.status === "ready" && (
              <Button size="sm" className="w-full h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => advance(order.id, "served")} disabled={updating === order.id}>
                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Mark Served
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen">
      <Header title="Kitchen Display" subtitle="Live order queue" />
      <div className="px-6 py-3 border-b border-gray-200 flex items-center gap-3 bg-white">
        <ChefHat className="w-4 h-4 text-[#5C432B]" />
        <Select value={outletId} onValueChange={(v) => v && setOutletId(v)}>
          <SelectTrigger className="w-44 h-8 text-sm"><SelectValue placeholder="Select outlet" /></SelectTrigger>
          <SelectContent>{outlets.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 ml-auto" onClick={load}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
        <span className="text-xs text-gray-400">Auto-refreshes every 15s</span>
      </div>
      <div className="flex-1 overflow-hidden p-4">
        {loading ? (
          <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin text-gray-300" /></div>
        ) : (
          <div className="flex gap-4 h-full">
            {col("Pending", "bg-amber-400", "bg-amber-100 text-amber-800", pending, "preparing", "→ Start Preparing")}
            {col("Preparing", "bg-blue-400", "bg-blue-100 text-blue-800", preparing, "ready", "→ Mark Ready")}
            {col("Ready", "bg-emerald-400", "bg-emerald-100 text-emerald-800", ready, undefined)}
          </div>
        )}
      </div>
    </div>
  );
}
