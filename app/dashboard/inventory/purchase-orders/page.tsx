"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Eye, CheckCircle, Trash2 } from "lucide-react";

interface Outlet { id: number; name: string; }
interface Vendor { id: number; name: string; }
interface Ingredient { id: number; name: string; unit: string; cost_per_unit: string; }
interface PO {
  id: number; po_number: string; vendor_name: string | null; status: string;
  items_count: number; total_cost: string; created_at: string; expected_date: string | null;
}
interface PODetail extends PO {
  items: { id: number; ingredient_name: string; unit: string; quantity_ordered: string; unit_cost: string; total_cost: string }[];
}
interface LineItem { ingredient_id: string; quantity_ordered: string; unit_cost: string; }

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  received: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-600",
};

const EMPTY_FORM = { vendor_id: "", expected_date: "", notes: "" };

export default function PurchaseOrdersPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outletId, setOutletId] = useState("");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [pos, setPos] = useState<PO[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<PODetail | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [lineItems, setLineItems] = useState<LineItem[]>([{ ingredient_id: "", quantity_ordered: "", unit_cost: "" }]);

  useEffect(() => {
    fetch("/api/outlets").then((r) => r.json()).then((d) => {
      const list = Array.isArray(d) ? d : [];
      setOutlets(list);
      if (list.length > 0) setOutletId(String(list[0].id));
    });
    fetch("/api/inventory/vendors").then((r) => r.json()).then((d) => setVendors(Array.isArray(d) ? d : []));
  }, []);

  const loadPOs = useCallback(() => {
    if (!outletId) return;
    setLoading(true);
    fetch(`/api/inventory/purchase-orders?outlet_id=${outletId}`)
      .then((r) => r.json())
      .then((d) => { setPos(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [outletId]);

  useEffect(() => { loadPOs(); }, [loadPOs]);

  useEffect(() => {
    if (!outletId) return;
    fetch(`/api/inventory/ingredients?outlet_id=${outletId}`)
      .then((r) => r.json())
      .then((d) => setIngredients(Array.isArray(d) ? d : []));
  }, [outletId]);

  async function handleCreate() {
    const validLines = lineItems.filter((l) => l.ingredient_id && l.quantity_ordered);
    if (!outletId || !validLines.length) return;
    setSaving(true);
    await fetch("/api/inventory/purchase-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outlet_id: parseInt(outletId),
        vendor_id: form.vendor_id ? parseInt(form.vendor_id) : null,
        expected_date: form.expected_date || null,
        notes: form.notes || null,
        items: validLines.map((l) => ({
          ingredient_id: parseInt(l.ingredient_id),
          quantity_ordered: parseFloat(l.quantity_ordered),
          unit_cost: parseFloat(l.unit_cost) || 0,
        })),
      }),
    });
    setSaving(false);
    setCreateOpen(false);
    setForm({ ...EMPTY_FORM });
    setLineItems([{ ingredient_id: "", quantity_ordered: "", unit_cost: "" }]);
    loadPOs();
  }

  async function handleView(po: PO) {
    setViewLoading(true);
    setViewOpen(true);
    const res = await fetch(`/api/inventory/purchase-orders/${po.id}`);
    const data = await res.json();
    setViewTarget(data);
    setViewLoading(false);
  }

  async function handleReceive(po: PO) {
    if (!confirm(`Mark PO ${po.po_number} as received? This will update stock levels.`)) return;
    await fetch(`/api/inventory/purchase-orders/${po.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "received" }),
    });
    loadPOs();
  }

  function addLine() {
    setLineItems((l) => [...l, { ingredient_id: "", quantity_ordered: "", unit_cost: "" }]);
  }

  function removeLine(idx: number) {
    setLineItems((l) => l.filter((_, i) => i !== idx));
  }

  function updateLine(idx: number, field: keyof LineItem, value: string) {
    setLineItems((l) => l.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  const totalEstimate = lineItems.reduce((sum, l) => {
    return sum + (parseFloat(l.quantity_ordered) || 0) * (parseFloat(l.unit_cost) || 0);
  }, 0);

  const columns: Column<PO>[] = [
    { key: "po_number", label: "PO Number", sortable: true },
    { key: "vendor_name", label: "Vendor", render: (row) => row.vendor_name || <span className="text-gray-400">—</span> },
    {
      key: "status", label: "Status",
      render: (row) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[row.status] ?? "bg-gray-100 text-gray-600"}`}>
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </span>
      ),
    },
    { key: "items_count", label: "Items", render: (row) => `${row.items_count} item${row.items_count !== 1 ? "s" : ""}` },
    { key: "total_cost", label: "Total Cost", render: (row) => `$${parseFloat(String(row.total_cost)).toFixed(2)}` },
    { key: "created_at", label: "Date", render: (row) => new Date(row.created_at).toLocaleDateString() },
    {
      key: "actions", label: "Actions",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => handleView(row)}>
            <Eye className="w-3 h-3 mr-1" /> View
          </Button>
          {(row.status === "draft" || row.status === "sent") && (
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => handleReceive(row)}>
              <CheckCircle className="w-3 h-3 mr-1" /> Receive
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <Header title="Purchase Orders" subtitle="Manage supplier orders and stock receipts" />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          {outlets.length > 1 && (
            <Select value={outletId} onValueChange={(v) => v && setOutletId(v)}>
              <SelectTrigger className="w-48 h-9 text-sm"><SelectValue placeholder="Select outlet" /></SelectTrigger>
              <SelectContent>
                {outlets.map((o) => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 ml-auto" onClick={() => { setForm({ ...EMPTY_FORM }); setLineItems([{ ingredient_id: "", quantity_ordered: "", unit_cost: "" }]); setCreateOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Create PO
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        ) : (
          <DataTable
            data={pos}
            columns={columns}
            searchKeys={["po_number", "vendor_name"]}
            searchPlaceholder="Search purchase orders..."
            emptyMessage="No purchase orders yet."
          />
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Purchase Order</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Vendor (optional)</Label>
                <Select value={form.vendor_id} onValueChange={(v) => v && setForm((f) => ({ ...f, vendor_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Expected Date</Label>
                <Input type="date" value={form.expected_date} onChange={(e) => setForm((f) => ({ ...f, expected_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input placeholder="Optional notes..." value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Line Items</Label>
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={addLine}>
                  <Plus className="w-3 h-3 mr-1" /> Add Row
                </Button>
              </div>
              <div className="space-y-2">
                {lineItems.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_120px_120px_32px] gap-2 items-start">
                    <div>
                      <Select value={line.ingredient_id} onValueChange={(v) => v && updateLine(idx, "ingredient_id", v)}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Ingredient" /></SelectTrigger>
                        <SelectContent>
                          {ingredients.map((i) => <SelectItem key={i.id} value={String(i.id)}>{i.name} ({i.unit})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      type="number" min="0" step="0.001" placeholder="Qty"
                      className="h-9 text-sm"
                      value={line.quantity_ordered}
                      onChange={(e) => updateLine(idx, "quantity_ordered", e.target.value)}
                    />
                    <Input
                      type="number" min="0" step="0.0001" placeholder="Unit Cost"
                      className="h-9 text-sm"
                      value={line.unit_cost}
                      onChange={(e) => updateLine(idx, "unit_cost", e.target.value)}
                    />
                    <Button type="button" size="sm" variant="outline" className="h-9 w-8 p-0 text-red-500" onClick={() => removeLine(idx)} disabled={lineItems.length === 1}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
              {totalEstimate > 0 && (
                <p className="text-sm font-medium text-gray-700 text-right">
                  Estimated Total: <span className="text-indigo-700">${totalEstimate.toFixed(2)}</span>
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Create PO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {viewTarget ? `PO: ${viewTarget.po_number}` : "Purchase Order"}
            </DialogTitle>
          </DialogHeader>
          {viewLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
            </div>
          ) : viewTarget ? (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Vendor:</span> <span className="font-medium">{viewTarget.vendor_name || "—"}</span></div>
                <div><span className="text-gray-500">Status:</span> <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ml-1 ${STATUS_COLOR[viewTarget.status]}`}>{viewTarget.status}</span></div>
                <div><span className="text-gray-500">Date:</span> <span className="font-medium">{new Date(viewTarget.created_at).toLocaleDateString()}</span></div>
                {viewTarget.expected_date && <div><span className="text-gray-500">Expected:</span> <span className="font-medium">{viewTarget.expected_date}</span></div>}
              </div>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Ingredient</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Qty</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Unit Cost</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewTarget.items.map((item, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="px-3 py-2">{item.ingredient_name}</td>
                        <td className="px-3 py-2 text-right">{parseFloat(String(item.quantity_ordered))} {item.unit}</td>
                        <td className="px-3 py-2 text-right">${parseFloat(String(item.unit_cost)).toFixed(4)}</td>
                        <td className="px-3 py-2 text-right">${parseFloat(String(item.total_cost)).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200 bg-gray-50">
                      <td colSpan={3} className="px-3 py-2 text-right font-semibold text-gray-700">Total</td>
                      <td className="px-3 py-2 text-right font-semibold text-indigo-700">${parseFloat(String(viewTarget.total_cost)).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
