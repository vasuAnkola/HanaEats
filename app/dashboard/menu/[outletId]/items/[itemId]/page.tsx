"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import Link from "next/link";
import {
  ArrowLeft, Loader2, Save, Plus, Trash2, ChevronDown, ChevronUp,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Category { id: number; name: string; }
interface VariantOption { id: number; name: string; price_modifier: number; display_order: number; }
interface Variant { id: number; name: string; is_required: boolean; display_order: number; options: VariantOption[] | null; }
interface AddOn { id: number; name: string; price: number; is_available: boolean; }
interface AddOnGroup { id: number; name: string; is_required: boolean; max_select: number | null; display_order: number; add_ons: AddOn[] | null; }

interface ItemDetail {
  id: number; name: string; description: string | null; sku: string | null;
  price: number; cost: number; prep_time: number | null; calories: number | null;
  category_id: number; category_name: string; is_available: boolean;
  is_halal: boolean; is_vegan: boolean; is_vegetarian: boolean;
  is_gluten_free: boolean; contains_nuts: boolean;
  variants: Variant[]; addons: AddOnGroup[];
}

type Props = { params: Promise<{ outletId: string; itemId: string }> };

const DIETARY_FIELDS = [
  { key: "is_halal", label: "Halal" },
  { key: "is_vegan", label: "Vegan" },
  { key: "is_vegetarian", label: "Vegetarian" },
  { key: "is_gluten_free", label: "Gluten Free" },
  { key: "contains_nuts", label: "Contains Nuts" },
] as const;

export default function ItemDetailPage({ params }: Props) {
  const { outletId, itemId } = use(params);
  const router = useRouter();
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", description: "", sku: "", price: "", cost: "", prep_time: "", calories: "", category_id: "" });
  const [dietary, setDietary] = useState({ is_halal: false, is_vegan: false, is_vegetarian: false, is_gluten_free: false, contains_nuts: false });

  // Variant dialog
  const [variantDialog, setVariantDialog] = useState(false);
  const [variantForm, setVariantForm] = useState({ name: "", is_required: false, options: [{ name: "", price_modifier: "0" }] });
  const [variantSaving, setVariantSaving] = useState(false);

  // Add-on dialog
  const [addonDialog, setAddonDialog] = useState(false);
  const [addonForm, setAddonForm] = useState({ name: "", is_required: false, max_select: "", add_ons: [{ name: "", price: "0" }] });
  const [addonSaving, setAddonSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ label: string; onConfirm: () => void } | null>(null);

  const load = useCallback(async () => {
    const [itemRes, catRes] = await Promise.all([
      fetch(`/api/menu/items/${itemId}`),
      fetch(`/api/menu/categories?outlet_id=${outletId}`),
    ]);
    const itemData = await itemRes.json();
    const catData = await catRes.json();
    setItem(itemData);
    setCategories(Array.isArray(catData) ? catData : []);
    setForm({
      name: itemData.name ?? "",
      description: itemData.description ?? "",
      sku: itemData.sku ?? "",
      price: String(itemData.price ?? ""),
      cost: String(itemData.cost ?? ""),
      prep_time: String(itemData.prep_time ?? ""),
      calories: String(itemData.calories ?? ""),
      category_id: String(itemData.category_id ?? ""),
    });
    setDietary({
      is_halal: !!itemData.is_halal,
      is_vegan: !!itemData.is_vegan,
      is_vegetarian: !!itemData.is_vegetarian,
      is_gluten_free: !!itemData.is_gluten_free,
      contains_nuts: !!itemData.contains_nuts,
    });
    setLoading(false);
  }, [itemId, outletId]);

  useEffect(() => { load(); }, [load]);

  function setF(key: string, val: string) { setForm((f) => ({ ...f, [key]: val })); }
  function toggleDietary(key: string) { setDietary((d) => ({ ...d, [key]: !d[key as keyof typeof d] })); }

  async function saveItem(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const res = await fetch(`/api/menu/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category_id: parseInt(form.category_id),
        name: form.name,
        description: form.description || null,
        sku: form.sku || null,
        price: parseFloat(form.price) || 0,
        cost: parseFloat(form.cost) || 0,
        prep_time: form.prep_time ? parseInt(form.prep_time) : null,
        calories: form.calories ? parseInt(form.calories) : null,
        dietary,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed"); setSaving(false); return; }
    setSaving(false);
    await load();
  }

  async function deleteItem() {
    setConfirmDelete({ label: "Delete this menu item permanently?", onConfirm: async () => {
      await fetch(`/api/menu/items/${itemId}`, { method: "DELETE" });
      setConfirmDelete(null);
      router.push(`/dashboard/menu/${outletId}`);
    }});
  }

  async function deleteVariant(id: number) {
    await fetch(`/api/menu/variants/${id}`, { method: "DELETE" });
    await load();
  }

  async function deleteAddonGroup(id: number) {
    await fetch(`/api/menu/addon-groups/${id}`, { method: "DELETE" });
    await load();
  }

  async function saveVariant() {
    setVariantSaving(true);
    await fetch(`/api/menu/items/${itemId}/variants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: variantForm.name,
        is_required: variantForm.is_required,
        options: variantForm.options.filter((o) => o.name).map((o, i) => ({ name: o.name, price_modifier: parseFloat(o.price_modifier) || 0, display_order: i })),
      }),
    });
    setVariantDialog(false);
    setVariantForm({ name: "", is_required: false, options: [{ name: "", price_modifier: "0" }] });
    setVariantSaving(false);
    await load();
  }

  async function saveAddon() {
    setAddonSaving(true);
    await fetch(`/api/menu/items/${itemId}/addons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: addonForm.name,
        is_required: addonForm.is_required,
        max_select: addonForm.max_select ? parseInt(addonForm.max_select) : null,
        add_ons: addonForm.add_ons.filter((a) => a.name).map((a, i) => ({ name: a.name, price: parseFloat(a.price) || 0, display_order: i })),
      }),
    });
    setAddonDialog(false);
    setAddonForm({ name: "", is_required: false, max_select: "", add_ons: [{ name: "", price: "0" }] });
    setAddonSaving(false);
    await load();
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
  );
  if (!item) return <div className="p-6 text-gray-500">Item not found.</div>;

  return (
    <div>
      <ConfirmDialog open={confirmDelete !== null} description={confirmDelete?.label ?? ""} onConfirm={() => confirmDelete?.onConfirm()} onCancel={() => setConfirmDelete(null)} />
      <Header />
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Link href={`/dashboard/menu/${outletId}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
            <ArrowLeft className="w-4 h-4" /> Back to Menu
          </Link>
          <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 gap-2 h-8 text-xs" onClick={deleteItem}>
            <Trash2 className="w-3.5 h-3.5" /> Delete Item
          </Button>
        </div>

        <form onSubmit={saveItem} className="space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <Card className="border-gray-200 shadow-none">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-gray-700">Basic Info</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Category</label>
                <Select value={form.category_id} onValueChange={(v) => setF("category_id", v ?? form.category_id)}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Name *</label>
                <Input className="mt-1" value={form.name} onChange={(e) => setF("name", e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Description</label>
                <Textarea className="mt-1 resize-none" rows={2} value={form.description} onChange={(e) => setF("description", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">SKU</label>
                <Input className="mt-1" placeholder="e.g. NL-001" value={form.sku} onChange={(e) => setF("sku", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className="border-gray-200 shadow-none">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-gray-700">Pricing</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Selling Price</label>
                  <Input type="number" min="0" step="0.01" className="mt-1" value={form.price} onChange={(e) => setF("price", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Cost Price</label>
                  <Input type="number" min="0" step="0.01" className="mt-1" value={form.cost} onChange={(e) => setF("cost", e.target.value)} />
                </div>
                {form.price && form.cost && parseFloat(form.price) > 0 && (
                  <p className="text-xs text-gray-500">
                    Margin: <span className="font-medium text-emerald-600">
                      {(((parseFloat(form.price) - parseFloat(form.cost)) / parseFloat(form.price)) * 100).toFixed(1)}%
                    </span>
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-none">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-gray-700">Details</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Prep Time (min)</label>
                  <Input type="number" min="0" className="mt-1" value={form.prep_time} onChange={(e) => setF("prep_time", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Calories (kcal)</label>
                  <Input type="number" min="0" className="mt-1" value={form.calories} onChange={(e) => setF("calories", e.target.value)} />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-gray-200 shadow-none">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-gray-700">Dietary Tags</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {DIETARY_FIELDS.map(({ key, label }) => (
                  <button key={key} type="button" onClick={() => toggleDietary(key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${dietary[key] ? "bg-[#5C432B] text-white border-[#5C432B]" : "bg-white text-gray-600 border-gray-200 hover:border-[#5C432B]/30"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" className="gap-2" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <Save className="w-4 h-4" /> Save Changes
            </Button>
          </div>
        </form>

        {/* Variants */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Variants</h3>
              <p className="text-xs text-gray-400">Size, spice level, crust type, etc.</p>
            </div>
            <Button size="sm" variant="outline" className="gap-1 h-8 text-xs" onClick={() => setVariantDialog(true)}>
              <Plus className="w-3.5 h-3.5" /> Add Variant
            </Button>
          </div>
          {(!item.variants || item.variants.length === 0) ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl py-8 text-center">
              <p className="text-sm text-gray-400">No variants yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {item.variants.map((v) => (
                <Card key={v.id} className="border-gray-200 shadow-none">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-gray-900">{v.name}</p>
                        {v.is_required && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">Required</span>}
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => deleteVariant(v.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(v.options ?? []).map((opt) => (
                        <span key={opt.id} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-md">
                          {opt.name}{opt.price_modifier !== 0 ? ` (+${parseFloat(String(opt.price_modifier)).toFixed(2)})` : ""}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Add-on Groups */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Add-on Groups</h3>
              <p className="text-xs text-gray-400">Toppings, sauces, sides, extras</p>
            </div>
            <Button size="sm" variant="outline" className="gap-1 h-8 text-xs" onClick={() => setAddonDialog(true)}>
              <Plus className="w-3.5 h-3.5" /> Add Group
            </Button>
          </div>
          {(!item.addons || item.addons.length === 0) ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl py-8 text-center">
              <p className="text-sm text-gray-400">No add-on groups yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {item.addons.map((g) => (
                <Card key={g.id} className="border-gray-200 shadow-none">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-gray-900">{g.name}</p>
                        {g.is_required && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">Required</span>}
                        {g.max_select && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600">Max {g.max_select}</span>}
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => deleteAddonGroup(g.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(g.add_ons ?? []).map((a) => (
                        <span key={a.id} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-md">
                          {a.name}{a.price > 0 ? ` (+${parseFloat(String(a.price)).toFixed(2)})` : ""}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Variant Dialog */}
      <Dialog open={variantDialog} onOpenChange={setVariantDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Variant Group</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-gray-600">Group Name</label>
              <Input className="mt-1" placeholder="e.g. Size, Spice Level" value={variantForm.name} onChange={(e) => setVariantForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={variantForm.is_required} onChange={(e) => setVariantForm((f) => ({ ...f, is_required: e.target.checked }))} className="rounded" />
              <span className="text-xs font-medium text-gray-600">Required selection</span>
            </label>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Options</p>
              <div className="space-y-2">
                {variantForm.options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <Input placeholder="Name (e.g. Small)" value={opt.name} className="flex-1 h-8 text-sm"
                      onChange={(e) => setVariantForm((f) => ({ ...f, options: f.options.map((o, j) => j === i ? { ...o, name: e.target.value } : o) }))} />
                    <Input type="number" step="0.01" placeholder="+0.00" value={opt.price_modifier} className="w-24 h-8 text-sm"
                      onChange={(e) => setVariantForm((f) => ({ ...f, options: f.options.map((o, j) => j === i ? { ...o, price_modifier: e.target.value } : o) }))} />
                    {variantForm.options.length > 1 && (
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400" onClick={() => setVariantForm((f) => ({ ...f, options: f.options.filter((_, j) => j !== i) }))}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs w-full"
                  onClick={() => setVariantForm((f) => ({ ...f, options: [...f.options, { name: "", price_modifier: "0" }] }))}>
                  <Plus className="w-3 h-3" /> Add Option
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVariantDialog(false)}>Cancel</Button>
            <Button onClick={saveVariant} disabled={variantSaving || !variantForm.name}>
              {variantSaving && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Add Variant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add-on Dialog */}
      <Dialog open={addonDialog} onOpenChange={setAddonDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Add-on Group</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-gray-600">Group Name</label>
              <Input className="mt-1" placeholder="e.g. Toppings, Sauces" value={addonForm.name} onChange={(e) => setAddonForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={addonForm.is_required} onChange={(e) => setAddonForm((f) => ({ ...f, is_required: e.target.checked }))} className="rounded" />
                <span className="text-xs font-medium text-gray-600">Required</span>
              </label>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-600">Max select</label>
                <Input type="number" min="1" placeholder="Any" value={addonForm.max_select} className="h-7 w-20 text-xs"
                  onChange={(e) => setAddonForm((f) => ({ ...f, max_select: e.target.value }))} />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Add-ons</p>
              <div className="space-y-2">
                {addonForm.add_ons.map((addon, i) => (
                  <div key={i} className="flex gap-2">
                    <Input placeholder="Name (e.g. Extra Cheese)" value={addon.name} className="flex-1 h-8 text-sm"
                      onChange={(e) => setAddonForm((f) => ({ ...f, add_ons: f.add_ons.map((a, j) => j === i ? { ...a, name: e.target.value } : a) }))} />
                    <Input type="number" step="0.01" min="0" placeholder="0.00" value={addon.price} className="w-24 h-8 text-sm"
                      onChange={(e) => setAddonForm((f) => ({ ...f, add_ons: f.add_ons.map((a, j) => j === i ? { ...a, price: e.target.value } : a) }))} />
                    {addonForm.add_ons.length > 1 && (
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400" onClick={() => setAddonForm((f) => ({ ...f, add_ons: f.add_ons.filter((_, j) => j !== i) }))}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs w-full"
                  onClick={() => setAddonForm((f) => ({ ...f, add_ons: [...f.add_ons, { name: "", price: "0" }] }))}>
                  <Plus className="w-3 h-3" /> Add Item
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddonDialog(false)}>Cancel</Button>
            <Button onClick={saveAddon} disabled={addonSaving || !addonForm.name}>
              {addonSaving && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Add Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
