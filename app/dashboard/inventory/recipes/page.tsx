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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Loader2, Plus, Eye, Pencil, Trash2, X, ChefHat, Flame } from "lucide-react";
import { toast } from "sonner";

interface MenuItem { id: number; name: string; }
interface Ingredient { id: number; name: string; unit: string; cost_per_unit: number; }
interface Recipe {
  id: number; name: string; menu_item_id: number | null; menu_item_name: string | null;
  yield_qty: number; yield_unit: string; is_active: boolean;
}
interface RecipeDetail extends Recipe {
  instructions: string | null; cost_per_serving: string; calories_per_serving: number | null;
  ingredients: { id: number; ingredient_id?: number; ingredient_name: string; ingredient_unit: string; quantity: number; unit: string; cost_per_unit: number; calories_per_unit: number | null }[];
}
interface IngLine { ingredient_id: string; quantity: string; unit: string; }

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [dialog, setDialog] = useState<"add" | "edit" | "detail" | null>(null);
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [detail, setDetail] = useState<RecipeDetail | null>(null);
  const [scaleServings, setScaleServings] = useState("1");
  const [syncingCalories, setSyncingCalories] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", menu_item_id: "", yield_qty: "1", yield_unit: "serving", instructions: "" });
  const [lines, setLines] = useState<IngLine[]>([{ ingredient_id: "", quantity: "0", unit: "g" }]);

  const load = useCallback(async () => {
    const res = await fetch("/api/inventory/recipes");
    const data = await readJson(res);
    if (!res.ok) { setLoadError(apiErrorMessage(data)); setRecipes([]); return; }
    setLoadError("");
    setRecipes(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    // Fetch menu items via outlets → first outlet's items
    fetch("/api/outlets").then(r => r.json()).then(async (outlets) => {
      if (!Array.isArray(outlets) || !outlets.length) return;
      const allItems: MenuItem[] = [];
      for (const o of outlets) {
        const d = await fetch(`/api/menu/items?outlet_id=${o.id}`).then(r => r.json());
        if (Array.isArray(d)) allItems.push(...d);
      }
      // deduplicate by id
      const seen = new Set<number>();
      setMenuItems(allItems.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; }));
    });
    fetch("/api/inventory/ingredients").then(readJson).then(d => setIngredients(Array.isArray(d) ? d : []));
  }, []);

  function openAdd() {
    setForm({ name: "", menu_item_id: "", yield_qty: "1", yield_unit: "serving", instructions: "" });
    setLines([{ ingredient_id: "", quantity: "0", unit: "g" }]);
    setError(""); setDialog("add");
  }

  async function openEdit(r: Recipe) {
    setSelected(r);
    const res = await fetch("/api/inventory/recipes/" + r.id);
    const data = await readJson<RecipeDetail>(res);
    if (!res.ok || !data) { setError(apiErrorMessage(data)); return; }
    setForm({ name: data.name, menu_item_id: data.menu_item_id ? String(data.menu_item_id) : "", yield_qty: String(data.yield_qty), yield_unit: data.yield_unit, instructions: data.instructions ?? "" });
    setLines(data.ingredients.map(i => ({ ingredient_id: String(i.ingredient_id ?? i.id), quantity: String(i.quantity), unit: i.unit })));
    setError(""); setDialog("edit");
  }

  async function syncCalories() {
    if (!detail?.menu_item_id || detail.calories_per_serving == null) return;
    setSyncingCalories(true);
    const res = await fetch(`/api/menu/items/${detail.menu_item_id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calories: detail.calories_per_serving }),
    });
    setSyncingCalories(false);
    if (!res.ok) { toast.error("Couldn't sync calories to the menu item"); return; }
    toast.success(`Menu item calories updated to ${detail.calories_per_serving} kcal`);
  }

  async function viewDetail(r: Recipe) {
    const res = await fetch("/api/inventory/recipes/" + r.id);
    const data = await readJson<RecipeDetail>(res);
    if (res.ok && data) {
      setDetail(data);
      setScaleServings(String(data.yield_qty));
      setDialog("detail");
    }
  }

  function addLine() { setLines(l => [...l, { ingredient_id: "", quantity: "0", unit: "g" }]); }
  function removeLine(i: number) { setLines(l => l.filter((_, idx) => idx !== i)); }
  function updateLine(i: number, field: keyof IngLine, val: string) {
    setLines(l => l.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
  }

  async function save() {
    setSaving(true); setError("");
    const url = dialog === "edit" ? "/api/inventory/recipes/" + selected!.id : "/api/inventory/recipes";
    const validLines = lines.filter(l => l.ingredient_id && parseFloat(l.quantity) > 0);
    const res = await fetch(url, {
      method: dialog === "edit" ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        menu_item_id: form.menu_item_id ? parseInt(form.menu_item_id) : null,
        yield_qty: parseFloat(form.yield_qty) || 1,
        yield_unit: form.yield_unit,
        instructions: form.instructions || null,
        ingredients: validLines.map(l => ({ ingredient_id: parseInt(l.ingredient_id), quantity: parseFloat(l.quantity), unit: l.unit })),
      }),
    });
    const data = await readJson(res);
    if (!res.ok) { setError(apiErrorMessage(data)); setSaving(false); return; }
    setDialog(null); setSaving(false); load();
  }

  async function del(id: number) {
    setConfirmId(id);
  }

  async function confirmDel() {
    if (confirmId === null) return;
    await fetch("/api/inventory/recipes/" + confirmId, { method: "DELETE" });
    setConfirmId(null);
    load();
  }

  const columns: Column<Recipe>[] = [
    {
      key: "name", label: "Recipe", sortable: true,
      render: r => (
        <div>
          <p className="font-medium text-gray-900 text-sm">{r.name}</p>
          {r.menu_item_name && <p className="text-[11px] text-gray-400 mt-0.5">Linked: {r.menu_item_name}</p>}
        </div>
      ),
    },
    {
      key: "yield_qty", label: "Yield",
      render: r => <span className="text-sm text-gray-600">{parseFloat(String(r.yield_qty))} {r.yield_unit}</span>,
    },
    {
      key: "actions", label: "",
      render: r => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-brand-primary" onClick={() => viewDetail(r)}>
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-brand-primary" onClick={() => openEdit(r)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-red-500" onClick={() => del(r.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const FormDialog = (
    <Dialog open={dialog === "add" || dialog === "edit"} onOpenChange={(o) => !o && setDialog(null)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{dialog === "edit" ? "Edit Recipe" : "New Recipe"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-1 max-h-[65vh] overflow-y-auto pr-1">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Recipe Name</label>
            <Input placeholder="e.g. Nasi Lemak" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Linked Menu Item (optional)</label>
            <Select value={form.menu_item_id} onValueChange={v => v && setForm(f => ({ ...f, menu_item_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select menu item..." /></SelectTrigger>
              <SelectContent>{menuItems.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Yield Qty</label>
              <Input type="number" min="0.001" step="0.001" value={form.yield_qty} onChange={e => setForm(f => ({ ...f, yield_qty: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Yield Unit</label>
              <Input placeholder="serving, batch, portion..." value={form.yield_unit} onChange={e => setForm(f => ({ ...f, yield_unit: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Instructions (optional)</label>
            <textarea className="w-full text-sm border border-input rounded-md px-3 py-2 resize-none h-20 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-background" placeholder="Preparation steps..." value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-600">Ingredients</label>
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={addLine}>+ Add Row</Button>
            </div>
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-[1fr_72px_60px_28px] gap-1.5 items-center">
                  <Select value={line.ingredient_id} onValueChange={v => {
                    if (!v) return;
                    const ing = ingredients.find(x => String(x.id) === v);
                    updateLine(i, "ingredient_id", v);
                    if (ing) updateLine(i, "unit", ing.unit);
                  }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Ingredient..." /></SelectTrigger>
                    <SelectContent>{ingredients.map(x => <SelectItem key={x.id} value={String(x.id)}>{x.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="number" min="0" step="0.001" className="h-8 text-xs" placeholder="Qty" value={line.quantity} onChange={e => updateLine(i, "quantity", e.target.value)} />
                  <Input
                    className="h-8 text-xs bg-gray-50 text-gray-500"
                    placeholder="unit"
                    value={line.unit}
                    readOnly
                    title="Locked to the ingredient's own stock unit — there's no unit conversion, so quantities here are always in that unit"
                  />
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-300 hover:text-red-500" onClick={() => removeLine(i)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !form.name}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />} {dialog === "edit" ? "Save Changes" : "Create Recipe"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div>
      <ConfirmDialog open={confirmId !== null} description="Delete this recipe? This cannot be undone." onConfirm={confirmDel} onCancel={() => setConfirmId(null)} />
      <Header title="Recipes" subtitle="Ingredient usage per dish and cost tracking" />
      <div className="p-6">
        {loadError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{loadError}</p>
        )}
        <div className="flex justify-end mb-6">
          <Button className="gap-2" onClick={openAdd}>
            <Plus className="w-4 h-4" /> New Recipe
          </Button>
        </div>

        {recipes === null ? (
          <TableSkeleton rows={5} cols={3} />
        ) : (
          <DataTable data={recipes} columns={columns} searchKeys={["name","menu_item_name"]} searchPlaceholder="Search recipes..." pageSize={25} emptyMessage="No recipes yet. Create your first recipe." />
        )}
      </div>

      {FormDialog}

      {/* Detail Dialog */}
      <Dialog open={dialog === "detail"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-rose-500" /> {detail?.name}
            </DialogTitle>
          </DialogHeader>
          {detail && (() => {
            const baseYield = parseFloat(String(detail.yield_qty)) || 1;
            const target = parseFloat(scaleServings) || baseYield;
            const scale = target / baseYield;
            const isScaled = Math.abs(scale - 1) > 0.001;
            return (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-gray-900">{parseFloat(String(detail.yield_qty))}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{detail.yield_unit} (base)</p>
                </div>
                <div className="bg-brand-section border border-brand-section rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-brand-primary">{parseFloat(String(detail.cost_per_serving)).toFixed(3)}</p>
                  <p className="text-xs text-brand-light mt-0.5">Cost / serving</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-emerald-700">{(parseFloat(String(detail.cost_per_serving)) * target).toFixed(2)}</p>
                  <p className="text-xs text-emerald-500 mt-0.5">Total at {target} {detail.yield_unit}</p>
                </div>
              </div>

              {detail.menu_item_name && (
                <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                  Linked to menu item: <strong className="text-gray-900">{detail.menu_item_name}</strong>
                </p>
              )}

              {detail.calories_per_serving != null ? (
                <div className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span className="text-sm text-orange-800"><strong>{detail.calories_per_serving} kcal</strong> / {detail.yield_unit}, calculated from ingredients</span>
                  </div>
                  {detail.menu_item_id && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={syncCalories} disabled={syncingCalories}>
                      {syncingCalories ? <Loader2 className="w-3 h-3 animate-spin" /> : "Sync to menu item"}
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-gray-400 px-1">Add calories/unit to every ingredient here to calculate this recipe's calories automatically.</p>
              )}

              <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                <span className="text-xs font-medium text-amber-800 whitespace-nowrap">Scale to</span>
                <Input type="number" min="0.1" step="0.1" value={scaleServings} onChange={e => setScaleServings(e.target.value)} className="h-8 text-sm w-24" />
                <span className="text-xs text-amber-700">{detail.yield_unit}{isScaled ? ` (×${scale.toFixed(2)})` : ""}</span>
              </div>

              <div className="border border-gray-100 rounded-xl divide-y divide-gray-100 overflow-hidden">
                <div className="grid grid-cols-[1fr_70px_70px] gap-2 px-4 py-2 bg-gray-50 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  <span>Ingredient</span><span className="text-right">Qty{isScaled ? " (scaled)" : ""}</span><span className="text-right">Cost</span>
                </div>
                {detail.ingredients.map((ing, i) => {
                  const scaledQty = parseFloat(String(ing.quantity)) * scale;
                  return (
                    <div key={i} className="grid grid-cols-[1fr_70px_70px] gap-2 px-4 py-2.5 items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{ing.ingredient_name}</p>
                        <p className="text-[11px] text-gray-400">{ing.unit}</p>
                      </div>
                      <span className="text-sm text-gray-600 text-right tabular-nums">{scaledQty.toFixed(3)}</span>
                      <span className="text-sm text-gray-700 font-medium text-right tabular-nums">{(scaledQty * parseFloat(String(ing.cost_per_unit))).toFixed(4)}</span>
                    </div>
                  );
                })}
              </div>

              {detail.instructions && (
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Instructions</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{detail.instructions}</p>
                </div>
              )}
            </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
