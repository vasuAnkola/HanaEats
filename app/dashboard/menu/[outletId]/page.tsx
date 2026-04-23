"use client";

import { use, useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import Link from "next/link";
import {
  ArrowLeft, Plus, Pencil, Trash2, Loader2, UtensilsCrossed,
  ToggleLeft, ToggleRight, ChevronRight, GripVertical,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Category {
  id: number;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  item_count: number;
}

interface MenuItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  cost: number;
  sku: string | null;
  is_available: boolean;
  is_halal: boolean;
  is_vegan: boolean;
  is_vegetarian: boolean;
  calories: number | null;
  prep_time: number | null;
  variant_count: number;
  addon_group_count: number;
  category_name: string;
}

type Props = { params: Promise<{ outletId: string }> };

const DIETARY_TAGS = [
  { key: "is_halal", label: "Halal", color: "bg-emerald-100 text-emerald-700" },
  { key: "is_vegan", label: "Vegan", color: "bg-green-100 text-green-700" },
  { key: "is_vegetarian", label: "Veg", color: "bg-lime-100 text-lime-700" },
];

export default function OutletMenuPage({ params }: Props) {
  const { outletId } = use(params);
  const [outletName, setOutletName] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);

  // Category dialog
  const [catDialog, setCatDialog] = useState(false);
  const [catEdit, setCatEdit] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState({ name: "", description: "" });
  const [catSaving, setCatSaving] = useState(false);
  const [catError, setCatError] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{ description: string; onConfirm: () => void } | null>(null);

  const loadCategories = useCallback(async () => {
    setLoadingCats(true);
    const res = await fetch(`/api/menu/categories?outlet_id=${outletId}`);
    const data = await res.json();
    setCategories(Array.isArray(data) ? data : []);
    setLoadingCats(false);
  }, [outletId]);

  const loadItems = useCallback(async (catId: number) => {
    setLoadingItems(true);
    const res = await fetch(`/api/menu/items?category_id=${catId}`);
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoadingItems(false);
  }, []);

  useEffect(() => {
    loadCategories();
    fetch(`/api/outlets/${outletId}`)
      .then((r) => r.json())
      .then((d) => setOutletName(d.name ?? ""));
  }, [outletId, loadCategories]);

  useEffect(() => {
    if (selectedCat) loadItems(selectedCat.id);
    else setItems([]);
  }, [selectedCat, loadItems]);

  function openAddCat() {
    setCatEdit(null);
    setCatForm({ name: "", description: "" });
    setCatError("");
    setCatDialog(true);
  }

  function openEditCat(c: Category) {
    setCatEdit(c);
    setCatForm({ name: c.name, description: c.description ?? "" });
    setCatError("");
    setCatDialog(true);
  }

  async function saveCat() {
    setCatSaving(true);
    setCatError("");
    if (catEdit) {
      const res = await fetch(`/api/menu/categories/${catEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: catForm.name, description: catForm.description || null }),
      });
      const data = await res.json();
      if (!res.ok) { setCatError(data.error ?? "Failed"); setCatSaving(false); return; }
    } else {
      const res = await fetch("/api/menu/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outlet_id: parseInt(outletId), name: catForm.name, description: catForm.description || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setCatError(data.error ?? "Failed"); setCatSaving(false); return; }
    }
    setCatDialog(false);
    setCatSaving(false);
    await loadCategories();
  }

  async function deleteCat(id: number) {
    setConfirmDialog({ description: "Delete this category and all its items? This cannot be undone.", onConfirm: async () => {
      await fetch(`/api/menu/categories/${id}`, { method: "DELETE" });
      if (selectedCat?.id === id) setSelectedCat(null);
      setConfirmDialog(null);
      await loadCategories();
    }});
  }

  async function toggleCat(c: Category) {
    await fetch(`/api/menu/categories/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !c.is_active }),
    });
    await loadCategories();
  }

  async function toggleItem(item: MenuItem) {
    await fetch(`/api/menu/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_available: !item.is_available }),
    });
    if (selectedCat) await loadItems(selectedCat.id);
  }

  async function deleteItem(id: number) {
    setConfirmDialog({ description: "Delete this menu item? This cannot be undone.", onConfirm: async () => {
      await fetch(`/api/menu/items/${id}`, { method: "DELETE" });
      setConfirmDialog(null);
      if (selectedCat) await loadItems(selectedCat.id);
    }});
  }

  return (
    <div>
      <ConfirmDialog open={confirmDialog !== null} description={confirmDialog?.description ?? ""} onConfirm={() => confirmDialog?.onConfirm()} onCancel={() => setConfirmDialog(null)} />
      <Header />
      <div className="p-6">
        <div className="mb-4">
          <Link href="/dashboard/menu" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
            <ArrowLeft className="w-4 h-4" /> All Outlets
          </Link>
        </div>

        <div className="flex gap-4 h-[calc(100vh-200px)]">
          {/* Categories Sidebar */}
          <div className="w-64 flex-shrink-0 flex flex-col gap-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Categories</p>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={openAddCat}>
                <Plus className="w-3 h-3" /> Add
              </Button>
            </div>
            {loadingCats ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
            ) : categories.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400">No categories yet</p>
                <Button size="sm" className="mt-3 gap-1 text-xs" onClick={openAddCat}>
                  <Plus className="w-3 h-3" /> Add Category
                </Button>
              </div>
            ) : (
              <div className="space-y-1 overflow-y-auto flex-1">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer border transition-colors ${
                      selectedCat?.id === c.id
                        ? "bg-[#5C432B]/10 border-[#5C432B]/30 text-[#5C432B]"
                        : "bg-white border-gray-100 hover:border-gray-200 text-gray-700"
                    }`}
                    onClick={() => setSelectedCat(c)}
                  >
                    <GripVertical className="w-3 h-3 text-gray-300 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${!c.is_active ? "text-gray-400" : ""}`}>{c.name}</p>
                      <p className="text-[10px] text-gray-400">{c.item_count} item{c.item_count !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); openEditCat(c); }}>
                        <Pencil className="w-3 h-3 text-gray-400" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); toggleCat(c); }}>
                        {c.is_active ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4 text-gray-300" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); deleteCat(c.id); }}>
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </Button>
                    </div>
                    {selectedCat?.id === c.id && <ChevronRight className="w-3 h-3 text-indigo-400 flex-shrink-0" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Items Panel */}
          <div className="flex-1 flex flex-col min-w-0">
            {!selectedCat ? (
              <div className="flex-1 flex items-center justify-center text-center">
                <div>
                  <UtensilsCrossed className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">Select a category to view items</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="font-semibold text-gray-900">{selectedCat.name}</h2>
                    <p className="text-xs text-gray-400">{selectedCat.item_count} items</p>
                  </div>
                  <Link href={`/dashboard/menu/${outletId}/items/new?category=${selectedCat.id}`}>
                    <Button className="gap-2 h-9">
                      <Plus className="w-4 h-4" /> Add Item
                    </Button>
                  </Link>
                </div>

                {loadingItems ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
                ) : items.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-center border-2 border-dashed border-gray-200 rounded-xl">
                    <div>
                      <UtensilsCrossed className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No items in this category yet</p>
                      <Link href={`/dashboard/menu/${outletId}/items/new?category=${selectedCat.id}`}>
                        <Button size="sm" className="mt-3 gap-1">
                          <Plus className="w-3.5 h-3.5" /> Add First Item
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-y-auto flex-1 space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className={`flex items-center gap-4 p-4 bg-white border rounded-xl transition-colors ${item.is_available ? "border-gray-200 hover:border-indigo-200" : "border-gray-100 bg-gray-50/50"}`}>
                        <div className="w-10 h-10 bg-[#5C432B]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <UtensilsCrossed className={`w-5 h-5 ${item.is_available ? "text-indigo-500" : "text-gray-300"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`font-medium text-sm ${item.is_available ? "text-gray-900" : "text-gray-400"}`}>{item.name}</p>
                            {!item.is_available && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">Unavailable</span>}
                            {DIETARY_TAGS.filter((t) => item[t.key as keyof MenuItem]).map((t) => (
                              <span key={t.key} className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${t.color}`}>{t.label}</span>
                            ))}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            <span className="text-sm font-semibold text-gray-800">
                              {parseFloat(String(item.price)).toFixed(2)}
                            </span>
                            {item.cost > 0 && <span className="text-xs text-gray-400">Cost: {parseFloat(String(item.cost)).toFixed(2)}</span>}
                            {item.sku && <span className="text-xs text-gray-400 font-mono">#{item.sku}</span>}
                            {item.prep_time && <span className="text-xs text-gray-400">{item.prep_time} min</span>}
                            {item.variant_count > 0 && <span className="text-xs text-indigo-500">{item.variant_count} variant{item.variant_count !== 1 ? "s" : ""}</span>}
                            {item.addon_group_count > 0 && <span className="text-xs text-indigo-500">{item.addon_group_count} add-on group{item.addon_group_count !== 1 ? "s" : ""}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Link href={`/dashboard/menu/${outletId}/items/${item.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-[#5C432B] hover:bg-[#5C432B]/10">
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost" size="sm"
                            className="h-8 w-8 p-0 text-gray-400 hover:text-green-600 hover:bg-green-50"
                            onClick={() => toggleItem(item)}
                            title={item.is_available ? "Mark unavailable" : "Mark available"}
                          >
                            {item.is_available ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => deleteItem(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Category Dialog */}
      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{catEdit ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {catError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{catError}</p>}
            <div>
              <label className="text-xs font-medium text-gray-600">Category Name</label>
              <Input className="mt-1" placeholder="e.g. Main Course" value={catForm.name} onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Description (optional)</label>
              <Input className="mt-1" placeholder="Short description" value={catForm.description} onChange={(e) => setCatForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialog(false)}>Cancel</Button>
            <Button onClick={saveCat} disabled={catSaving || !catForm.name}>
              {catSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {catEdit ? "Save" : "Add Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
