"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { apiErrorMessage, readJson } from "@/lib/api-client";
import { AlertTriangle, History, Pencil, Plus } from "lucide-react";
import { Loader2 } from "lucide-react";

interface Ingredient {
  id: number; name: string; unit: string; category_name: string | null;
  cost_per_unit: number; stock_quantity: number; low_stock_threshold: number;
}
interface Movement {
  id: number; movement_type: string; quantity: number; unit: string;
  notes: string | null; created_at: string; created_by_name: string | null;
}

const UNITS = ["kg","g","L","ml","pcs","dozen","box","bottle","bag","sack"];
const MOVE_TYPES = ["adjustment","wastage","opening"];

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[] | null>(null);
  const [dialog, setDialog] = useState<"add" | "edit" | "adjust" | "history" | null>(null);
  const [selected, setSelected] = useState<Ingredient | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [movements, setMovements] = useState<Movement[]>([]);
  const [form, setForm] = useState({ name: "", unit: "kg", cost_per_unit: "0", stock_quantity: "0", low_stock_threshold: "0" });
  const [adjForm, setAdjForm] = useState({ quantity: "0", movement_type: "adjustment", notes: "" });

  const load = useCallback(async () => {
    const res = await fetch("/api/inventory/ingredients");
    const data = await readJson(res);
    setIngredients(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    fetch("/api/inventory/ingredients")
      .then(readJson)
      .then((data) => setIngredients(Array.isArray(data) ? data : []));
  }, []);

  function openAdd() {
    setForm({ name: "", unit: "kg", cost_per_unit: "0", stock_quantity: "0", low_stock_threshold: "0" });
    setError(""); setDialog("add");
  }
  function openEdit(i: Ingredient) {
    setSelected(i);
    setForm({ name: i.name, unit: i.unit, cost_per_unit: String(i.cost_per_unit), stock_quantity: String(i.stock_quantity), low_stock_threshold: String(i.low_stock_threshold) });
    setError(""); setDialog("edit");
  }
  function openAdjust(i: Ingredient) {
    setSelected(i); setAdjForm({ quantity: "0", movement_type: "adjustment", notes: "" });
    setError(""); setDialog("adjust");
  }
  async function openHistory(i: Ingredient) {
    setSelected(i);
    const res = await fetch("/api/inventory/movements?ingredient_id=" + i.id);
    const data = await readJson(res);
    setMovements(Array.isArray(data) ? data : []);
    setDialog("history");
  }

  async function save() {
    setSaving(true); setError("");
    const url = dialog === "edit" ? "/api/inventory/ingredients/" + selected!.id : "/api/inventory/ingredients";
    const res = await fetch(url, {
      method: dialog === "edit" ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, unit: form.unit, cost_per_unit: parseFloat(form.cost_per_unit) || 0, stock_quantity: parseFloat(form.stock_quantity) || 0, low_stock_threshold: parseFloat(form.low_stock_threshold) || 0 }),
    });
    const data = await readJson(res);
    if (!res.ok) { setError(apiErrorMessage(data)); setSaving(false); return; }
    setDialog(null); setSaving(false); load();
  }

  async function adjust() {
    setSaving(true); setError("");
    const res = await fetch("/api/inventory/ingredients/" + selected!.id, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "adjust", quantity: parseFloat(adjForm.quantity) || 0, movement_type: adjForm.movement_type, notes: adjForm.notes }),
    });
    const data = await readJson(res);
    if (!res.ok) { setError(apiErrorMessage(data)); setSaving(false); return; }
    setDialog(null); setSaving(false); load();
  }

  const isLow = (i: Ingredient) =>
    parseFloat(String(i.stock_quantity)) <= parseFloat(String(i.low_stock_threshold)) &&
    parseFloat(String(i.low_stock_threshold)) > 0;

  const lowCount = (ingredients ?? []).filter(isLow).length;

  const columns: Column<Ingredient>[] = [
    {
      key: "name", label: "Ingredient", sortable: true,
      render: i => (
        <div className="flex items-center gap-2.5">
          {isLow(i) && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
          <div>
            <p className="font-medium text-gray-900 text-sm">{i.name}</p>
            {i.category_name && <p className="text-[11px] text-gray-400 mt-0.5">{i.category_name}</p>}
          </div>
        </div>
      ),
    },
    {
      key: "stock_quantity", label: "Stock", sortable: true,
      render: i => (
        <span className={"text-sm font-semibold " + (isLow(i) ? "text-amber-600" : "text-gray-900")}>
          {parseFloat(String(i.stock_quantity)).toFixed(3)} <span className="font-normal text-gray-400 text-xs">{i.unit}</span>
        </span>
      ),
    },
    {
      key: "low_stock_threshold", label: "Min Level",
      render: i => <span className="text-sm text-gray-500">{parseFloat(String(i.low_stock_threshold)).toFixed(3)} <span className="text-xs text-gray-400">{i.unit}</span></span>,
    },
    {
      key: "cost_per_unit", label: "Cost / Unit", sortable: true,
      render: i => <span className="text-sm text-gray-700 font-medium">{parseFloat(String(i.cost_per_unit)).toFixed(4)}</span>,
    },
    {
      key: "actions", label: "",
      render: i => (
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={() => openAdjust(i)}>Adjust</Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-indigo-600" onClick={() => openHistory(i)}>
            <History className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-indigo-600" onClick={() => openEdit(i)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Header title="Ingredients" subtitle="Track stock levels and ingredient costs" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            {lowCount > 0 && (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">{lowCount} ingredient{lowCount > 1 ? "s" : ""} low on stock</span>
              </div>
            )}
          </div>
          <Button className="gap-2" onClick={openAdd}>
            <Plus className="w-4 h-4" /> Add Ingredient
          </Button>
        </div>

        {ingredients === null ? (
          <TableSkeleton rows={7} cols={5} />
        ) : (
          <DataTable data={ingredients} columns={columns} searchKeys={["name"]} searchPlaceholder="Search ingredients..." pageSize={25} emptyMessage="No ingredients yet. Add your first ingredient." />
        )}
      </div>

      {/* Add / Edit */}
      <Dialog open={dialog === "add" || dialog === "edit"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{dialog === "edit" ? "Edit Ingredient" : "Add Ingredient"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Name</label>
              <Input placeholder="e.g. Chicken Breast" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Unit</label>
                <Select value={form.unit} onValueChange={v => v && setForm(f => ({ ...f, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Cost / Unit</label>
                <Input type="number" min="0" step="0.0001" value={form.cost_per_unit} onChange={e => setForm(f => ({ ...f, cost_per_unit: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Opening Stock</label>
                <Input type="number" min="0" step="0.001" value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Low Stock Alert</label>
                <Input type="number" min="0" step="0.001" value={form.low_stock_threshold} onChange={e => setForm(f => ({ ...f, low_stock_threshold: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !form.name}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />} {dialog === "edit" ? "Save Changes" : "Add Ingredient"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock */}
      <Dialog open={dialog === "adjust"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Adjust Stock — {selected?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-600">
              Current stock: <strong className="text-gray-900">{selected ? parseFloat(String(selected.stock_quantity)).toFixed(3) : 0} {selected?.unit}</strong>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Quantity Change</label>
              <Input type="number" step="0.001" placeholder="Use negative to remove stock" value={adjForm.quantity} onChange={e => setAdjForm(f => ({ ...f, quantity: e.target.value }))} />
              <p className="text-[11px] text-gray-400">Positive = add stock, Negative = remove stock</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Movement Type</label>
              <Select value={adjForm.movement_type} onValueChange={v => v && setAdjForm(f => ({ ...f, movement_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MOVE_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Notes (optional)</label>
              <Input placeholder="Reason for adjustment..." value={adjForm.notes} onChange={e => setAdjForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={adjust} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />} Apply Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History */}
      <Dialog open={dialog === "history"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Stock History — {selected?.name}</DialogTitle></DialogHeader>
          <div className="max-h-[420px] overflow-y-auto space-y-1.5 py-1">
            {movements.length === 0 ? (
              <div className="text-center py-10 text-sm text-gray-400">No stock movements recorded yet.</div>
            ) : movements.map(m => (
              <div key={m.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">
                <div>
                  <span className={"text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide " + (parseFloat(String(m.quantity)) >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600")}>
                    {m.movement_type}
                  </span>
                  {m.notes && <p className="text-xs text-gray-500 mt-1">{m.notes}</p>}
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {new Date(m.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {m.created_by_name ? " · " + m.created_by_name : ""}
                  </p>
                </div>
                <span className={"text-sm font-bold tabular-nums " + (parseFloat(String(m.quantity)) >= 0 ? "text-emerald-600" : "text-red-500")}>
                  {parseFloat(String(m.quantity)) >= 0 ? "+" : ""}{parseFloat(String(m.quantity)).toFixed(3)} {m.unit}
                </span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
