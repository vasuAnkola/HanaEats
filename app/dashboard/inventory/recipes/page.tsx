"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, Trash2, ChefHat, BookOpen } from "lucide-react";

interface Outlet { id: number; name: string; }
interface MenuItem { id: number; name: string; price: string; }
interface Recipe { id: number; menu_item_id: number; menu_item_name: string; menu_item_price: string; yield_quantity: string; notes: string | null; ingredient_count: number; }
interface Ingredient { id: number; name: string; unit: string; cost_per_unit: string; }
interface RecipeIngredientRow { ingredient_id: string; quantity_used: string; unit: string; }
interface RecipeDetail extends Recipe {
  ingredients: { ingredient_id: number; ingredient_name: string; ingredient_unit: string; quantity_used: string; unit: string; cost_per_unit: string }[];
}

export default function RecipesPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outletId, setOutletId] = useState("");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [builderOpen, setBuilderOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<RecipeDetail | null>(null);

  const [selectedMenuItemId, setSelectedMenuItemId] = useState("");
  const [yieldQty, setYieldQty] = useState("1");
  const [notes, setNotes] = useState("");
  const [recipeRows, setRecipeRows] = useState<RecipeIngredientRow[]>([{ ingredient_id: "", quantity_used: "", unit: "" }]);
  const [editRecipeId, setEditRecipeId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/outlets").then((r) => r.json()).then((d) => {
      const list = Array.isArray(d) ? d : [];
      setOutlets(list);
      if (list.length > 0) setOutletId(String(list[0].id));
    });
  }, []);

  const loadData = useCallback(() => {
    if (!outletId) return;
    setLoading(true);

    Promise.all([
      fetch(`/api/inventory/recipes?outlet_id=${outletId}`).then((r) => r.json()),
      fetch(`/api/inventory/ingredients?outlet_id=${outletId}`).then((r) => r.json()),
      fetch(`/api/menu/items?outlet_id=${outletId}`).then((r) => r.json()),
    ]).then(([recipesData, ingrData, itemsData]) => {
      setRecipes(Array.isArray(recipesData) ? recipesData : []);
      setIngredients(Array.isArray(ingrData) ? ingrData : []);
      setMenuItems(Array.isArray(itemsData) ? itemsData : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [outletId]);

  useEffect(() => { loadData(); }, [loadData]);

  function openBuilder(menuItemId?: number, existingRecipe?: Recipe) {
    if (menuItemId) {
      setSelectedMenuItemId(String(menuItemId));
    } else {
      setSelectedMenuItemId("");
    }
    if (existingRecipe) {
      setEditRecipeId(existingRecipe.id);
      setYieldQty(String(parseFloat(String(existingRecipe.yield_quantity))));
      setNotes(existingRecipe.notes || "");
      fetch(`/api/inventory/recipes/${existingRecipe.id}`)
        .then((r) => r.json())
        .then((data: RecipeDetail) => {
          setRecipeRows(
            data.ingredients.length > 0
              ? data.ingredients.map((i) => ({ ingredient_id: String(i.ingredient_id), quantity_used: String(parseFloat(String(i.quantity_used))), unit: i.unit }))
              : [{ ingredient_id: "", quantity_used: "", unit: "" }]
          );
        });
    } else {
      setEditRecipeId(null);
      setYieldQty("1");
      setNotes("");
      setRecipeRows([{ ingredient_id: "", quantity_used: "", unit: "" }]);
    }
    setBuilderOpen(true);
  }

  async function handleSaveRecipe() {
    if (!selectedMenuItemId || !outletId) return;
    const validRows = recipeRows.filter((r) => r.ingredient_id && r.quantity_used);
    setSaving(true);
    await fetch("/api/inventory/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        menu_item_id: parseInt(selectedMenuItemId),
        outlet_id: parseInt(outletId),
        yield_quantity: parseFloat(yieldQty) || 1,
        notes: notes || null,
        ingredients: validRows.map((r) => ({
          ingredient_id: parseInt(r.ingredient_id),
          quantity_used: parseFloat(r.quantity_used),
          unit: r.unit || ingredients.find((i) => String(i.id) === r.ingredient_id)?.unit || "unit",
        })),
      }),
    });
    setSaving(false);
    setBuilderOpen(false);
    loadData();
  }

  async function handleDeleteRecipe(id: number) {
    if (!confirm("Delete this recipe?")) return;
    await fetch(`/api/inventory/recipes/${id}`, { method: "DELETE" });
    loadData();
  }

  async function handleView(recipe: Recipe) {
    const res = await fetch(`/api/inventory/recipes/${recipe.id}`);
    const data = await res.json();
    setViewTarget(data);
    setViewOpen(true);
  }

  function addRow() {
    setRecipeRows((r) => [...r, { ingredient_id: "", quantity_used: "", unit: "" }]);
  }

  function removeRow(idx: number) {
    setRecipeRows((r) => r.filter((_, i) => i !== idx));
  }

  function updateRow(idx: number, field: keyof RecipeIngredientRow, value: string) {
    setRecipeRows((r) => r.map((row, i) => {
      if (i !== idx) return row;
      if (field === "ingredient_id") {
        const ing = ingredients.find((ig) => String(ig.id) === value);
        return { ...row, ingredient_id: value, unit: ing?.unit ?? row.unit };
      }
      return { ...row, [field]: value };
    }));
  }

  const recipeItemIds = new Set(recipes.map((r) => r.menu_item_id));

  const recipeIngredientCost = viewTarget
    ? viewTarget.ingredients.reduce((sum, i) => {
        return sum + parseFloat(String(i.quantity_used)) * parseFloat(String(i.cost_per_unit));
      }, 0)
    : 0;

  return (
    <div>
      <Header title="Recipes" subtitle="Link menu items to ingredients for cost tracking" />
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
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 ml-auto" onClick={() => openBuilder()}>
            <Plus className="w-4 h-4 mr-1" /> New Recipe
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Menu Item</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Selling Price</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Recipe</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Ingredients</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {menuItems.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-12 text-sm text-gray-400">No menu items found for this outlet.</td></tr>
                  )}
                  {menuItems.map((item) => {
                    const recipe = recipes.find((r) => r.menu_item_id === item.id);
                    return (
                      <tr key={item.id} className="border-t border-gray-100 hover:bg-indigo-50/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                        <td className="px-4 py-3 text-gray-600">${parseFloat(String(item.price)).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          {recipe ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                              <ChefHat className="w-3 h-3" /> Has Recipe
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                              No Recipe
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {recipe ? `${recipe.ingredient_count} ingredient${recipe.ingredient_count !== 1 ? "s" : ""}` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {recipe ? (
                              <>
                                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => handleView(recipe)}>
                                  <BookOpen className="w-3 h-3 mr-1" /> View
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => openBuilder(item.id, recipe)}>
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteRecipe(recipe.id)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </>
                            ) : (
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" onClick={() => openBuilder(item.id)}>
                                <Plus className="w-3 h-3 mr-1" /> Add Recipe
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Dialog open={builderOpen} onOpenChange={setBuilderOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editRecipeId ? "Edit Recipe" : "New Recipe"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Menu Item</Label>
              <Select value={selectedMenuItemId} onValueChange={(v) => v && setSelectedMenuItemId(v)}>
                <SelectTrigger><SelectValue placeholder="Select menu item" /></SelectTrigger>
                <SelectContent>
                  {menuItems.map((mi) => (
                    <SelectItem key={mi.id} value={String(mi.id)}>
                      {mi.name} — ${parseFloat(String(mi.price)).toFixed(2)}
                      {recipeItemIds.has(mi.id) && !editRecipeId && " (has recipe)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Yield Quantity</Label>
                <Input type="number" min="0.001" step="0.001" value={yieldQty} onChange={(e) => setYieldQty(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Input placeholder="Optional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Ingredients</Label>
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={addRow}>
                  <Plus className="w-3 h-3 mr-1" /> Add Row
                </Button>
              </div>
              <div className="grid grid-cols-[8px_1fr_100px_80px_32px] gap-1 mb-1">
                <div></div>
                <span className="text-xs text-gray-500 font-medium px-1">Ingredient</span>
                <span className="text-xs text-gray-500 font-medium px-1">Quantity</span>
                <span className="text-xs text-gray-500 font-medium px-1">Unit</span>
                <div></div>
              </div>
              {recipeRows.map((row, idx) => (
                <div key={idx} className="grid grid-cols-[8px_1fr_100px_80px_32px] gap-2 items-center">
                  <div className="text-xs text-gray-400 text-center">{idx + 1}</div>
                  <Select value={row.ingredient_id} onValueChange={(v) => v && updateRow(idx, "ingredient_id", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select ingredient" /></SelectTrigger>
                    <SelectContent>
                      {ingredients.map((i) => <SelectItem key={i.id} value={String(i.id)}>{i.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number" min="0" step="0.0001" placeholder="0.000"
                    className="h-9 text-sm"
                    value={row.quantity_used}
                    onChange={(e) => updateRow(idx, "quantity_used", e.target.value)}
                  />
                  <Input
                    placeholder="unit"
                    className="h-9 text-sm"
                    value={row.unit}
                    onChange={(e) => updateRow(idx, "unit", e.target.value)}
                  />
                  <Button type="button" size="sm" variant="outline" className="h-9 w-8 p-0 text-red-500" onClick={() => removeRow(idx)} disabled={recipeRows.length === 1}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuilderOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSaveRecipe} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Recipe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewTarget?.menu_item_name}</DialogTitle>
          </DialogHeader>
          {viewTarget && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Selling Price:</span> <span className="font-medium">${parseFloat(String(viewTarget.menu_item_price)).toFixed(2)}</span></div>
                <div><span className="text-gray-500">Yield:</span> <span className="font-medium">{parseFloat(String(viewTarget.yield_quantity))} portion{parseFloat(String(viewTarget.yield_quantity)) !== 1 ? "s" : ""}</span></div>
              </div>
              {viewTarget.notes && <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{viewTarget.notes}</p>}
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Ingredient</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Quantity</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewTarget.ingredients.map((ing, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="px-3 py-2">{ing.ingredient_name}</td>
                        <td className="px-3 py-2 text-right">{parseFloat(String(ing.quantity_used))} {ing.unit}</td>
                        <td className="px-3 py-2 text-right">${(parseFloat(String(ing.quantity_used)) * parseFloat(String(ing.cost_per_unit))).toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200 bg-gray-50">
                      <td colSpan={2} className="px-3 py-2 text-right font-semibold text-gray-700">Recipe Cost</td>
                      <td className="px-3 py-2 text-right font-semibold text-indigo-700">${recipeIngredientCost.toFixed(4)}</td>
                    </tr>
                    {parseFloat(String(viewTarget.menu_item_price)) > 0 && (
                      <tr className="border-t border-gray-100">
                        <td colSpan={2} className="px-3 py-2 text-right text-gray-500 text-xs">Gross Margin</td>
                        <td className="px-3 py-2 text-right text-xs text-emerald-600 font-medium">
                          {(((parseFloat(String(viewTarget.menu_item_price)) - recipeIngredientCost) / parseFloat(String(viewTarget.menu_item_price))) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    )}
                  </tfoot>
                </table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
