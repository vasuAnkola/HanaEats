"use client";

import { use, useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import Link from "next/link";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, UtensilsCrossed, ChevronRight, Clock, Tag } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Category {
  id: number; name: string; description: string | null;
  display_order: number; is_active: boolean; item_count: number;
}

interface MenuItem {
  id: number; name: string; description: string | null;
  price: number; cost: number; sku: string | null;
  is_available: boolean; is_halal: boolean; is_vegan: boolean; is_vegetarian: boolean;
  calories: number | null; prep_time: number | null;
  variant_count: number; addon_group_count: number; category_name: string;
}

type Props = { params: Promise<{ outletId: string }> };

const DIETARY_TAGS = [
  { key: "is_halal",      label: "Halal", color: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  { key: "is_vegan",      label: "Vegan", color: "bg-green-50 text-green-700 ring-1 ring-green-200" },
  { key: "is_vegetarian", label: "Veg",   color: "bg-lime-50 text-lime-700 ring-1 ring-lime-200" },
];

export default function OutletMenuPage({ params }: Props) {
  const { outletId } = use(params);
  const [outletName, setOutletName] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [togglingItem, setTogglingItem] = useState<number | null>(null);

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
    fetch(`/api/outlets/${outletId}`).then((r) => r.json()).then((d) => setOutletName(d.name ?? ""));
  }, [outletId, loadCategories]);

  useEffect(() => {
    if (selectedCat) loadItems(selectedCat.id);
    else setItems([]);
  }, [selectedCat, loadItems]);

  function openAddCat() { setCatEdit(null); setCatForm({ name: "", description: "" }); setCatError(""); setCatDialog(true); }
  function openEditCat(c: Category) { setCatEdit(c); setCatForm({ name: c.name, description: c.description ?? "" }); setCatError(""); setCatDialog(true); }

  async function saveCat() {
    setCatSaving(true); setCatError("");
    if (catEdit) {
      const res = await fetch(`/api/menu/categories/${catEdit.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: catForm.name, description: catForm.description || null }) });
      const data = await res.json();
      if (!res.ok) { setCatError(data.error ?? "Failed"); setCatSaving(false); return; }
    } else {
      const res = await fetch("/api/menu/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ outlet_id: parseInt(outletId), name: catForm.name, description: catForm.description || undefined }) });
      const data = await res.json();
      if (!res.ok) { setCatError(data.error ?? "Failed"); setCatSaving(false); return; }
    }
    setCatDialog(false); setCatSaving(false); await loadCategories();
  }

  async function deleteCat(id: number) {
    setConfirmDialog({ description: "Delete this category and all its items? This cannot be undone.", onConfirm: async () => {
      await fetch(`/api/menu/categories/${id}`, { method: "DELETE" });
      if (selectedCat?.id === id) setSelectedCat(null);
      setConfirmDialog(null); await loadCategories();
    }});
  }

  async function toggleCat(c: Category) {
    await fetch(`/api/menu/categories/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: !c.is_active }) });
    await loadCategories();
  }

  async function toggleItem(item: MenuItem) {
    setTogglingItem(item.id);
    await fetch(`/api/menu/items/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_available: !item.is_available }) });
    if (selectedCat) await loadItems(selectedCat.id);
    setTogglingItem(null);
  }

  async function deleteItem(id: number) {
    setConfirmDialog({ description: "Delete this menu item? This cannot be undone.", onConfirm: async () => {
      await fetch(`/api/menu/items/${id}`, { method: "DELETE" });
      setConfirmDialog(null); if (selectedCat) await loadItems(selectedCat.id);
    }});
  }

  return (
    <div>
      <ConfirmDialog open={confirmDialog !== null} description={confirmDialog?.description ?? ""} onConfirm={() => confirmDialog?.onConfirm()} onCancel={() => setConfirmDialog(null)} />
      <Header title={outletName || "Menu"} subtitle="Manage categories and items" />
      <div className="p-6">
        <Link href="/dashboard/menu" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 mb-5 transition-colors">
          <ArrowLeft className="w-4 h-4" /> All Outlets
        </Link>

        <div className="flex gap-5 h-[calc(100vh-220px)]">

          {/* Categories Sidebar */}
          <div className="w-60 flex-shrink-0 flex flex-col bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Categories</p>
              <Button size="sm" className="h-7 gap-1 text-xs px-2.5" onClick={openAddCat}>
                <Plus className="w-3 h-3" /> Add
              </Button>
            </div>
            {loadingCats ? (
              <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-blue-300" /></div>
            ) : categories.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 py-10 px-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
                  <UtensilsCrossed className="w-5 h-5 text-blue-300" />
                </div>
                <p className="text-xs text-gray-400 mb-3">No categories yet</p>
                <Button size="sm" className="gap-1 text-xs h-7" onClick={openAddCat}>
                  <Plus className="w-3 h-3" /> Add Category
                </Button>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 p-2 space-y-1">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCat(c)}
                    className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                      selectedCat?.id === c.id
                        ? "bg-blue-400 text-white shadow-sm"
                        : "hover:bg-blue-50 text-gray-700"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${selectedCat?.id === c.id ? "text-white" : !c.is_active ? "text-gray-400" : "text-gray-800"}`}>{c.name}</p>
                      <p className={`text-[10px] mt-0.5 ${selectedCat?.id === c.id ? "text-white-100" : "text-gray-400"}`}>{c.item_count} item{c.item_count !== 1 ? "s" : ""}</p>
                    </div>
                    {selectedCat?.id === c.id ? (
                      <ChevronRight className="w-3.5 h-3.5 text-blue-200 flex-shrink-0" />
                    ) : (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); openEditCat(c); }} className="w-6 h-6 rounded-lg hover:bg-blue-100 flex items-center justify-center">
                          <Pencil className="w-3 h-3 text-gray-400" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deleteCat(c.id); }} className="w-6 h-6 rounded-lg hover:bg-red-50 flex items-center justify-center">
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Items Panel */}
          <div className="flex-1 flex flex-col min-w-0">
            {!selectedCat ? (
              <div className="flex-1 flex items-center justify-center bg-white border border-gray-100 rounded-2xl shadow-sm">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                    <UtensilsCrossed className="w-8 h-8 text-blue-200" />
                  </div>
                  <p className="text-gray-500 font-medium">Select a category</p>
                  <p className="text-sm text-gray-400 mt-1">Choose a category from the left to view its items</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                {/* Items header */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900">{selectedCat.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{selectedCat.item_count} item{selectedCat.item_count !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* <button onClick={() => toggleCat(selectedCat)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${selectedCat.is_active ? "bg-emerald-500" : "bg-gray-300"}`}>
                      <span className={`inline-block w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${selectedCat.is_active ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button> */}
                    <Link href={`/dashboard/menu/${outletId}/items/new?category=${selectedCat.id}`}>
                      <Button className="gap-2 h-9"><Plus className="w-4 h-4" /> Add Item</Button>
                    </Link>
                  </div>
                </div>

                {/* Items list */}
                <div className="flex-1 overflow-y-auto p-4">
                  {loadingItems ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-blue-300" /></div>
                  ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                        <UtensilsCrossed className="w-7 h-7 text-blue-200" />
                      </div>
                      <p className="text-gray-500 font-medium">No items yet</p>
                      <p className="text-sm text-gray-400 mt-1 mb-4">Add your first item to this category</p>
                      <Link href={`/dashboard/menu/${outletId}/items/new?category=${selectedCat.id}`}>
                        <Button size="sm" className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Add First Item</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div key={item.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                          item.is_available ? "border-gray-100 hover:border-blue-200 hover:shadow-sm" : "border-gray-100 bg-gray-50/60 opacity-60"
                        }`}>
                          {/* Icon */}
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${item.is_available ? "bg-blue-600" : "bg-gray-200"}`}>
                            <UtensilsCrossed className="w-5 h-5 text-white" />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                              {!item.is_available && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Unavailable</span>
                              )}
                              {DIETARY_TAGS.filter((t) => item[t.key as keyof MenuItem]).map((t) => (
                                <span key={t.key} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.color}`}>{t.label}</span>
                              ))}
                            </div>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              <span className="text-sm font-bold text-blue-700">{parseFloat(String(item.price)).toFixed(2)}</span>
                              {item.cost > 0 && <span className="text-xs text-gray-400">Cost: {parseFloat(String(item.cost)).toFixed(2)}</span>}
                              {item.prep_time && (
                                <span className="flex items-center gap-1 text-xs text-gray-400"><Clock className="w-3 h-3" />{item.prep_time}m</span>
                              )}
                              {item.sku && <span className="flex items-center gap-1 text-xs text-gray-400 font-mono"><Tag className="w-3 h-3" />{item.sku}</span>}
                              {item.variant_count > 0 && <span className="text-xs text-blue-500 font-medium">{item.variant_count} variant{item.variant_count !== 1 ? "s" : ""}</span>}
                              {item.addon_group_count > 0 && <span className="text-xs text-blue-500 font-medium">{item.addon_group_count} add-on{item.addon_group_count !== 1 ? "s" : ""}</span>}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => toggleItem(item)}
                              disabled={togglingItem === item.id}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${item.is_available ? "bg-emerald-500" : "bg-gray-300"}`}
                            >
                              <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${item.is_available ? "translate-x-4" : "translate-x-0.5"}`}>
                                {togglingItem === item.id && <Loader2 className="w-2.5 h-2.5 animate-spin text-gray-400" />}
                              </span>
                            </button>
                            <Link href={`/dashboard/menu/${outletId}/items/${item.id}`}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50">
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            </Link>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50" onClick={() => deleteItem(item.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Dialog */}
      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{catEdit ? "Edit Category" : "Add Category"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {catError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{catError}</p>}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Category Name</label>
              <Input placeholder="e.g. Main Course" value={catForm.name} onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Description (optional)</label>
              <Input placeholder="Short description" value={catForm.description} onChange={(e) => setCatForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialog(false)}>Cancel</Button>
            <Button onClick={saveCat} disabled={catSaving || !catForm.name}>
              {catSaving && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              {catEdit ? "Save Changes" : "Add Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
