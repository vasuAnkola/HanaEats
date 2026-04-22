"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Loader2, Plus, Eye, CheckCircle, X } from "lucide-react";

interface Vendor { id: number; name: string; }
interface Ingredient { id: number; name: string; unit: string; cost_per_unit: number; }
interface PO {
  id: number; po_number: string; status: string; total_amount: number;
  vendor_name: string | null; outlet_name: string | null;
  notes: string | null; created_at: string;
}
interface PODetail extends PO {
  items: { id: number; ingredient_name: string; unit: string; quantity: number; unit_cost: number; received_qty: number }[];
}
interface LineItem { ingredient_id: string; quantity: string; unit_cost: string; }

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  received: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-600",
};

export default function PurchaseOrdersPage() {
  const [pos, setPos] = useState<PO[] | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [dialog, setDialog] = useState<"add" | "detail" | null>(null);
  const [detail, setDetail] = useState<PODetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState({ vendor_id: "", notes: "" });
  const [lines, setLines] = useState<LineItem[]>([{ ingredient_id: "", quantity: "1", unit_cost: "0" }]);

  const load = useCallback(async () => {
    setPos(null);
    const url = "/api/inventory/purchase-orders" + (statusFilter !== "all" ? "?status=" + statusFilter : "");
    const res = await fetch(url);
    const data = await res.json();
    setPos(Array.isArray(data) ? data : []);
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/inventory/vendors").then(r => r.json()).then(d => setVendors(Array.isArray(d) ? d : []));
    fetch("/api/inventory/ingredients").then(r => r.json()).then(d => setIngredients(Array.isArray(d) ? d : []));
  }, []);

  function openAdd() {
    setForm({ vendor_id: "", notes: "" });
    setLines([{ ingredient_id: "", quantity: "1", unit_cost: "0" }]);
    setError(""); setDialog("add");
  }

  async function viewDetail(id: number) {
    const res = await fetch("/api/inventory/purchase-orders/" + id);
    setDetail(await res.json()); setDialog("detail");
  }

  function addLine() { setLines(l => [...l, { ingredient_id: "", quantity: "1", unit_cost: "0" }]); }
  function removeLine(i: number) { setLines(l => l.filter((_, idx) => idx !== i)); }
  function updateLine(i: number, field: keyof LineItem, val: string) {
    setLines(l => l.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
  }

  const lineTotal = lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_cost) || 0), 0);

  async function savePO() {
    setSaving(true); setError("");
    const validLines = lines.filter(l => l.ingredient_id && parseFloat(l.quantity) > 0);
    if (!validLines.length) { setError("Add at least one ingredient line"); setSaving(false); return; }
    const res = await fetch("/api/inventory/purchase-orders", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vendor_id: form.vendor_id ? parseInt(form.vendor_id) : null,
        notes: form.notes,
        items: validLines.map(l => ({ ingredient_id: parseInt(l.ingredient_id), quantity: parseFloat(l.quantity), unit_cost: parseFloat(l.unit_cost) })),
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed"); setSaving(false); return; }
    setDialog(null); setSaving(false); load();
  }

  async function updateStatus(id: number, action: string) {
    if (action === "receive") setReceiving(true);
    const body = action === "receive" ? { action: "receive" } : { status: action };
    await fetch("/api/inventory/purchase-orders/" + id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setReceiving(false); setDialog(null); setDetail(null); load();
  }

  const columns: Column<PO>[] = [
    {
      key: "po_number", label: "PO Number", sortable: true,
      render: p => (
        <div>
          <p className="font-mono font-semibold text-gray-900 text-sm">{p.po_number}</p>
          {p.vendor_name && <p className="text-[11px] text-gray-400 mt-0.5">{p.vendor_name}</p>}
        </div>
      ),
    },
    {
      key: "status", label: "Status", sortable: true,
      render: p => (
        <span className={"text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide " + (STATUS_COLOR[p.status] ?? "bg-gray-100 text-gray-500")}>
          {p.status}
        </span>
      ),
    },
    {
      key: "total_amount", label: "Total", sortable: true,
      render: p => <span className="text-sm font-semibold text-gray-900">{parseFloat(String(p.total_amount)).toFixed(2)}</span>,
    },
    {
      key: "created_at", label: "Date", sortable: true,
      render: p => <span className="text-xs text-gray-500">{new Date(p.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>,
    },
    {
      key: "actions", label: "",
      render: p => (
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-indigo-600" onClick={() => viewDetail(p.id)}>
          <Eye className="w-3.5 h-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Header title="Purchase Orders" subtitle="Create and receive stock from vendors" />
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Select value={statusFilter} onValueChange={v => v && setStatusFilter(v)}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {["draft","sent","received","cancelled"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="ml-auto">
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={openAdd}>
              <Plus className="w-4 h-4" /> New Purchase Order
            </Button>
          </div>
        </div>

        {pos === null ? (
          <TableSkeleton rows={6} cols={5} />
        ) : (
          <DataTable data={pos} columns={columns} searchKeys={["po_number","vendor_name"]} searchPlaceholder="Search purchase orders..." pageSize={25} emptyMessage="No purchase orders yet." />
        )}
      </div>

      {/* Create PO */}
      <Dialog open={dialog === "add"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1 max-h-[65vh] overflow-y-auto pr-1">
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Vendor (optional)</label>
              <Select value={form.vendor_id} onValueChange={v => v && setForm(f => ({ ...f, vendor_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select vendor..." /></SelectTrigger>
                <SelectContent>{vendors.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Notes</label>
              <Input placeholder="Any notes for this order..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-600">Line Items</label>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-indigo-600 hover:text-indigo-700" onClick={addLine}>+ Add Row</Button>
              </div>
              <div className="space-y-2">
                {lines.map((line, i) => (
                  <div key={i} className="grid grid-cols-[1fr_80px_80px_28px] gap-1.5 items-center">
                    <Select value={line.ingredient_id} onValueChange={v => {
                      if (!v) return;
                      const found = ingredients.find(x => String(x.id) === v);
                      updateLine(i, "ingredient_id", v);
                      if (found) updateLine(i, "unit_cost", String(found.cost_per_unit));
                    }}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Ingredient..." /></SelectTrigger>
                      <SelectContent>{ingredients.map(x => <SelectItem key={x.id} value={String(x.id)}>{x.name} ({x.unit})</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="number" min="0.001" step="0.001" className="h-8 text-xs" placeholder="Qty" value={line.quantity} onChange={e => updateLine(i, "quantity", e.target.value)} />
                    <Input type="number" min="0" step="0.0001" className="h-8 text-xs" placeholder="Cost" value={line.unit_cost} onChange={e => updateLine(i, "unit_cost", e.target.value)} />
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-300 hover:text-red-500" onClick={() => removeLine(i)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-1">
                <p className="text-sm text-gray-500">Total: <strong className="text-gray-900 text-base">{lineTotal.toFixed(2)}</strong></p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={savePO} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />} Create Purchase Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PO Detail */}
      <Dialog open={dialog === "detail"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono">{detail?.po_number}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={"text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide " + (STATUS_COLOR[detail.status] ?? "")}>{detail.status}</span>
                {detail.vendor_name && <span className="text-sm text-gray-500">{detail.vendor_name}</span>}
              </div>

              <div className="border border-gray-100 rounded-xl divide-y divide-gray-100 overflow-hidden">
                <div className="grid grid-cols-[1fr_80px_80px] gap-2 px-4 py-2 bg-gray-50 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  <span>Ingredient</span><span className="text-right">Qty</span><span className="text-right">Amount</span>
                </div>
                {detail.items.map(item => (
                  <div key={item.id} className="grid grid-cols-[1fr_80px_80px] gap-2 px-4 py-2.5 items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.ingredient_name}</p>
                      <p className="text-[11px] text-gray-400">{parseFloat(String(item.quantity)).toFixed(3)} {item.unit} @ {parseFloat(String(item.unit_cost)).toFixed(4)}</p>
                    </div>
                    <span className="text-sm text-gray-600 text-right">{parseFloat(String(item.quantity)).toFixed(2)}</span>
                    <span className="text-sm font-semibold text-gray-900 text-right">{(parseFloat(String(item.quantity)) * parseFloat(String(item.unit_cost))).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-2.5 bg-gray-50">
                  <span className="text-sm font-semibold text-gray-700">Total</span>
                  <span className="text-sm font-bold text-gray-900">{parseFloat(String(detail.total_amount)).toFixed(2)}</span>
                </div>
              </div>

              {detail.notes && <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">{detail.notes}</p>}

              <div className="flex gap-2 flex-wrap pt-1">
                {detail.status === "draft" && (
                  <>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => updateStatus(detail.id, "sent")}>
                      Mark as Sent
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => updateStatus(detail.id, "cancelled")}>
                      <X className="w-3.5 h-3.5 mr-1" /> Cancel PO
                    </Button>
                  </>
                )}
                {detail.status === "sent" && (
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={() => updateStatus(detail.id, "receive")} disabled={receiving}>
                    {receiving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Receive Stock
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}