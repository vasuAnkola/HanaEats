"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { apiErrorMessage, readJson } from "@/lib/api-client";
import { Loader2, Plus, Trash2, Copy, Check, Truck } from "lucide-react";
import { toast } from "sonner";

interface Outlet { id: number; name: string; }

interface PlatformConfig {
  id: number; outlet_id: number; platform: string; is_active: boolean;
  api_key: string | null; commission_pct: number; webhook_token: string;
}

interface DeliveryOrder {
  order_id: number; order_number: string; order_status: string; total: number; created_at: string;
  delivery_order_id: number; platform_status: string; external_order_id: string;
  customer_name: string | null; customer_phone: string | null; delivery_address: string | null;
  platform: string;
}

const PLATFORM_LABEL: Record<string, string> = { grabfood: "GrabFood", foodpanda: "Foodpanda", gofood: "GoFood" };
const PLATFORM_COLOR: Record<string, string> = {
  grabfood: "bg-green-50 text-green-700 border-green-200",
  foodpanda: "bg-pink-50 text-pink-700 border-pink-200",
  gofood: "bg-red-50 text-red-700 border-red-200",
};
const STATUS_OPTIONS = ["accepted", "preparing", "ready", "picked_up", "delivered", "cancelled"];
const fmt = (n: number | string) => "RM " + parseFloat(String(n || 0)).toFixed(2);

export default function DeliveryPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outletId, setOutletId] = useState("");
  const [platforms, setPlatforms] = useState<PlatformConfig[] | null>(null);
  const [orders, setOrders] = useState<DeliveryOrder[] | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newPlatform, setNewPlatform] = useState("grabfood");
  const [commission, setCommission] = useState("0");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/outlets").then(readJson).then(d => {
      const list = Array.isArray(d) ? d : [];
      setOutlets(list);
      if (list.length && !outletId) setOutletId(String(list[0].id));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPlatforms = useCallback(async () => {
    if (!outletId) return;
    const data = await fetch(`/api/delivery/platforms?outlet_id=${outletId}`).then(readJson);
    setPlatforms(Array.isArray(data) ? data : []);
  }, [outletId]);

  const loadOrders = useCallback(async () => {
    if (!outletId) return;
    const data = await fetch(`/api/delivery/orders?outlet_id=${outletId}`).then(readJson);
    setOrders(Array.isArray(data) ? data : []);
  }, [outletId]);

  useEffect(() => { loadPlatforms(); loadOrders(); }, [loadPlatforms, loadOrders]);

  async function addPlatform() {
    setSaving(true); setError("");
    const res = await fetch("/api/delivery/platforms", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outlet_id: parseInt(outletId), platform: newPlatform, commission_pct: commission, api_key: apiKey }),
    });
    const data = await readJson(res);
    if (!res.ok) { setError(apiErrorMessage(data)); setSaving(false); return; }
    setAddOpen(false); setSaving(false); setApiKey(""); setCommission("0");
    loadPlatforms();
  }

  async function toggleActive(p: PlatformConfig) {
    await fetch(`/api/delivery/platforms/${p.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !p.is_active }),
    });
    loadPlatforms();
  }

  async function confirmDel() {
    if (confirmId === null) return;
    await fetch(`/api/delivery/platforms/${confirmId}`, { method: "DELETE" });
    setConfirmId(null);
    loadPlatforms();
  }

  function webhookUrl(token: string) {
    return typeof window !== "undefined" ? `${window.location.origin}/api/delivery/webhook/${token}` : `/api/delivery/webhook/${token}`;
  }

  function copyWebhook(p: PlatformConfig) {
    navigator.clipboard.writeText(webhookUrl(p.webhook_token)).then(() => {
      setCopiedId(p.id);
      toast.success("Webhook URL copied");
      setTimeout(() => setCopiedId(null), 1500);
    });
  }

  async function updateStatus(row: DeliveryOrder, platform_status: string) {
    await fetch(`/api/delivery/orders/${row.delivery_order_id}/status`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform_status }),
    });
    loadOrders();
  }

  const orderCols: Column<DeliveryOrder>[] = [
    { key: "platform", label: "Platform", render: r => (
      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${PLATFORM_COLOR[r.platform] ?? ""}`}>{PLATFORM_LABEL[r.platform] ?? r.platform}</span>
    )},
    { key: "order_number", label: "Order #", sortable: true },
    { key: "external_order_id", label: "Platform Order ID" },
    { key: "customer_name", label: "Customer", render: r => (
      <div>
        <p className="text-sm text-gray-800">{r.customer_name ?? "—"}</p>
        {r.customer_phone && <p className="text-xs text-gray-400">{r.customer_phone}</p>}
      </div>
    )},
    { key: "total", label: "Total", sortable: true, render: r => <span className="font-semibold text-brand-primary">{fmt(r.total)}</span> },
    { key: "platform_status", label: "Status", render: r => (
      <Select value={r.platform_status} onValueChange={v => v && updateStatus(r, v)}>
        <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}
        </SelectContent>
      </Select>
    )},
    { key: "created_at", label: "Received", render: r => <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString()}</span> },
  ];

  return (
    <div>
      <Header title="Delivery Platforms" subtitle="Manage GrabFood, Foodpanda & GoFood integrations" />
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Select value={outletId} onValueChange={v => v && setOutletId(v)}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Select outlet" /></SelectTrigger>
            <SelectContent>{outlets.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList>
            <TabsTrigger value="orders">Unified Order Queue</TabsTrigger>
            <TabsTrigger value="platforms">Platform Setup</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              {orders === null ? <TableSkeleton rows={6} cols={7} /> : (
                <DataTable data={orders} columns={orderCols} searchKeys={["order_number", "external_order_id", "customer_name"]}
                  searchPlaceholder="Search delivery orders..." pageSize={20}
                  emptyMessage="No delivery orders yet. Orders from configured platforms will appear here automatically." />
              )}
            </div>
          </TabsContent>

          <TabsContent value="platforms" className="space-y-4">
            <div className="flex justify-end">
              <Button className="gap-2" onClick={() => { setError(""); setAddOpen(true); }} disabled={!outletId}>
                <Plus className="w-4 h-4" /> Connect Platform
              </Button>
            </div>

            {platforms === null ? <TableSkeleton rows={3} cols={4} /> : platforms.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-sm text-gray-400">
                <Truck className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                No delivery platforms connected for this outlet yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {platforms.map(p => (
                  <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${PLATFORM_COLOR[p.platform] ?? ""}`}>{PLATFORM_LABEL[p.platform] ?? p.platform}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleActive(p)}
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${p.is_active ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
                          {p.is_active ? "Active" : "Paused"}
                        </button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-red-500" onClick={() => setConfirmId(p.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">Commission: <span className="font-medium text-gray-700">{p.commission_pct}%</span></div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Webhook URL</label>
                      <div className="flex items-center gap-1.5">
                        <Input readOnly value={webhookUrl(p.webhook_token)} className="text-xs h-8 font-mono" />
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => copyWebhook(p)}>
                          {copiedId === p.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                      <p className="text-[11px] text-gray-400">Give this URL to {PLATFORM_LABEL[p.platform]} as the order webhook endpoint.</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ConfirmDialog open={confirmId !== null} description="Disconnect this platform? Existing orders are kept, but new orders won't be received." onConfirm={confirmDel} onCancel={() => setConfirmId(null)} />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Connect Delivery Platform</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Platform</label>
              <Select value={newPlatform} onValueChange={v => v && setNewPlatform(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="grabfood">GrabFood</SelectItem>
                  <SelectItem value="foodpanda">Foodpanda</SelectItem>
                  <SelectItem value="gofood">GoFood</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">API Key (optional)</label>
              <Input placeholder="Platform API key" value={apiKey} onChange={e => setApiKey(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Commission %</label>
              <Input type="number" step="0.01" value={commission} onChange={e => setCommission(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addPlatform} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />} Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
