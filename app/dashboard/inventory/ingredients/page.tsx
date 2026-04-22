"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, Trash2, TrendingUp, AlertTriangle } from "lucide-react";

interface Outlet { id: number; name: string; }
interface Ingredient {
  id: number; name: string; unit: string; cost_per_unit: string;
  reorder_level: string; current_stock: string; category_name: string | null;
  low_stock: boolean; category_id: number | null;
}
interface Category { id: number; name: string; }

const UNITS = ["kg", "g", "L", "ml", "pcs", "portion", "box", "bag"];

const EMPTY_FORM = {
  name: "", unit: "kg", cost_per_unit: "", reorder_level: "", current_stock: "", category_id: "",
};

export default function IngredientsPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outletId, setOutletId] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editTarget, setEditTarget] = useState<Ingredient | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<Ingredient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Ingredient | null>(null);
  const [adjustForm, setAdjustForm] = useState({ type: "in", quantity: "", note: "" });

  useEffect(() => {
    fetch("/api/outlets")
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setOutlets(list);
        if (list.length > 0) setOutletId(String(list[0].id));
      });
  }, []);

  const loadIngredients = useCallback(() => {
    if (!outletId) return;
    setLoading(true);
    fetch(`/api/inventory/ingredients?outlet_id=${outletId}`)
      .then((r) => r.json())
      .then((d) => { setIngredients(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [outletId]);

  useEffect(() => { loadIngredients(); }, [loadIngredients]);

  async function handleAdd() {
    if (!form.name || !form.unit || !outletId) return;
    setSaving(true);
    await fetch("/api/inventory/ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outlet_id: parseInt(outletId), name: form.name, unit: form.unit,
        cost_per_unit: parseFloat(form.cost_per_unit) || 0,
        reorder_level: parseFloat(form.reorder_level) || 0,
        current_stock: parseFloat(form.current_stock) || 0,
        category_id: form.category_id ? parseInt(form.category_id) : null,
      }),
    });
    setSaving(false);
    setAddOpen(false);
    setForm({ ...EMPTY_FORM });
    loadIngredients();
  }

  async function handleEdit() {
    if (!editTarget) return;
    setSaving(true);
    await fetch(`/api/inventory/ingredients/${editTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name, unit: form.unit,
        cost_per_unit: parseFloat(form.cost_per_unit) || 0,
        reorder_level: parseFloat(form.reorder_level) || 0,
        current_stock: parseFloat(form.current_stock) || 0,
        category_id: form.category_id ? parseInt(form.category_id) : null,
      }),
    });
    setSaving(false);
    setEditOpen(false);
    setEditTarget(null);
    loadIngredients();
  }

  async function handleAdjust() {
    if (!adjustTarget || !adjustForm.quantity || !outletId) return;
    setSaving(true);
    await fetch("/api/inventory/movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ingredient_id: adjustTarget.id, outlet_id: parseInt(outletId),
        type: adjustForm.type, quantity: parseFloat(adjustForm.quantity),
        note: adjustForm.note || null,
      }),
    });
    setSaving(false);
    setAdjustOpen(false);
    setAdjustTarget(null);
    setAdjustForm({ type: "in", quantity: "", note: "" });
    loadIngredients();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    await fetch(`/api/inventory/ingredients/${deleteTarget.id}`, { method: "DELETE" });
    setSaving(false);
    setDeleteOpen(false);
    setDeleteTarget(null);
    loadIngredients();
  }

  function openEdit(row: Ingredient) {
    setEditTarget(row);
    setForm({
      name: row.name, unit: row.unit,
      cost_per_unit: String(parseFloat(String(row.cost_per_unit))),
      reorder_level: String(parseFloat(String(row.reorder_level))),
      current_stock: String(parseFloat(String(row.current_stock))),
      category_id: row.category_id ? String(row.category_id) : "",
    });
    setEditOpen(true);
  }

  const columns: Column<Ingredient>[] = [
    { key: "name", label: "Name", sortable: true },
    { key: "category_name", label: "Category", render: (row) => row.category_name || <span className="text-gray-400">—</span> },
    { key: "unit", label: "Unit" },
    { key: "cost_per_unit", label: "Cost/Unit", render: (row) => `$${parseFloat(String(row.cost_per_unit)).toFixed(4)}` },
    {
      key: "current_stock", label: "Stock",
      render: (row) => {
        const stock = parseFloat(String(row.current_stock));
        return row.low_stock ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <AlertTriangle className="w-3 h-3" /> {stock} {row.unit}
          </span>
        ) : (
          <span className="text-gray-800">{stock} {row.unit}</span>
        );
      },
    },
    { key: "reorder_level", label: "Reorder Level", render: (row) => `${parseFloat(String(row.reorder_level))} ${row.unit}` },
    {
      key: "actions", label: "Actions",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => { setAdjustTarget(row); setAdjustOpen(true); }}>
            <TrendingUp className="w-3 h-3 mr-1" /> Adjust
          </Button>
          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => openEdit(row)}>
            <Pencil className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="outline" className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => { setDeleteTarget(row); setDeleteOpen(true); }}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Header title="Ingredients" subtitle="Manage your ingredient catalog and stock levels" />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          {outlets.length > 1 && (
            <Select value={outletId} onValueChange={(v) => v && setOutletId(v)}>
              <SelectTrigger className="w-48 h-9 text-sm">
                <SelectValue placeholder="Select outlet" />
              </SelectTrigger>
              <SelectContent>
                {outlets.map((o) => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 ml-auto" onClick={() => { setForm({ ...EMPTY_FORM }); setAddOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Add Ingredient
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        ) : (
          <DataTable
            data={ingredients}
            columns={columns}
            searchKeys={["name", "category_name"]}
            searchPlaceholder="Search ingredients..."
            emptyMessage="No ingredients yet. Add your first ingredient."
          />
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Ingredient</DialogTitle></DialogHeader>
          <IngredientForm form={form} setForm={setForm} categories={categories} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleAdd} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Ingredient</DialogTitle></DialogHeader>
          <IngredientForm form={form} setForm={setForm} categories={categories} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleEdit} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Stock Adjust — {adjustTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={adjustForm.type} onValueChange={(v) => v && setAdjustForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Stock In</SelectItem>
                  <SelectItem value="out">Stock Out</SelectItem>
                  <SelectItem value="adjust">Set Exact Level</SelectItem>
                  <SelectItem value="waste">Wastage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Quantity ({adjustTarget?.unit})</Label>
              <Input
                type="number" min="0" step="0.001" placeholder="0.000"
                value={adjustForm.quantity}
                onChange={(e) => setAdjustForm((f) => ({ ...f, quantity: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Note (optional)</Label>
              <Input
                placeholder="Reason..."
                value={adjustForm.note}
                onChange={(e) => setAdjustForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleAdjust} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete Ingredient</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600 py-2">
            Remove <strong>{deleteTarget?.name}</strong> from inventory? This will mark it as inactive.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IngredientForm({
  form, setForm, categories,
}: {
  form: typeof EMPTY_FORM;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>;
  categories: Category[];
}) {
  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label>Name</Label>
        <Input placeholder="e.g. Chicken Breast" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Unit</Label>
          <Select value={form.unit} onValueChange={(v) => v && setForm((f) => ({ ...f, unit: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Cost per Unit ($)</Label>
          <Input type="number" min="0" step="0.0001" placeholder="0.00" value={form.cost_per_unit} onChange={(e) => setForm((f) => ({ ...f, cost_per_unit: e.target.value }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Reorder Level</Label>
          <Input type="number" min="0" step="0.001" placeholder="0" value={form.reorder_level} onChange={(e) => setForm((f) => ({ ...f, reorder_level: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Opening Stock</Label>
          <Input type="number" min="0" step="0.001" placeholder="0" value={form.current_stock} onChange={(e) => setForm((f) => ({ ...f, current_stock: e.target.value }))} />
        </div>
      </div>
      {categories.length > 0 && (
        <div className="space-y-1.5">
          <Label>Category (optional)</Label>
          <Select value={form.category_id} onValueChange={(v) => v && setForm((f) => ({ ...f, category_id: v }))}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
