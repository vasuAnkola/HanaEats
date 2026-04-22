"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";

interface Category {
  id: number;
  name: string;
}

type Props = { params: Promise<{ outletId: string }> };

const DIETARY_FIELDS = [
  { key: "is_halal", label: "Halal" },
  { key: "is_vegan", label: "Vegan" },
  { key: "is_vegetarian", label: "Vegetarian" },
  { key: "is_gluten_free", label: "Gluten Free" },
  { key: "contains_nuts", label: "Contains Nuts" },
] as const;

export default function NewItemPage({ params }: Props) {
  const { outletId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultCat = searchParams.get("category") ?? "";

  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    name: "", description: "", sku: "",
    price: "", cost: "", prep_time: "", calories: "",
    category_id: defaultCat,
  });
  const [dietary, setDietary] = useState({
    is_halal: false, is_vegan: false, is_vegetarian: false,
    is_gluten_free: false, contains_nuts: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/menu/categories?outlet_id=${outletId}`)
      .then((r) => r.json())
      .then((d) => setCategories(Array.isArray(d) ? d : []));
  }, [outletId]);

  function setF(key: string, val: string) { setForm((f) => ({ ...f, [key]: val })); }
  function toggleDietary(key: string) { setDietary((d) => ({ ...d, [key]: !d[key as keyof typeof d] })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch("/api/menu/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category_id: parseInt(form.category_id),
        outlet_id: parseInt(outletId),
        name: form.name,
        description: form.description || undefined,
        sku: form.sku || undefined,
        price: parseFloat(form.price) || 0,
        cost: parseFloat(form.cost) || 0,
        prep_time: form.prep_time ? parseInt(form.prep_time) : undefined,
        calories: form.calories ? parseInt(form.calories) : undefined,
        dietary,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed"); setSaving(false); return; }

    router.push(`/dashboard/menu/${outletId}/items/${data.id}`);
  }

  return (
    <div>
      <Header />
      <div className="p-6 max-w-2xl">
        <div className="mb-4">
          <Link href={`/dashboard/menu/${outletId}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
            <ArrowLeft className="w-4 h-4" /> Back to Menu
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <Card className="border-gray-200 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700">Basic Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Category *</label>
                <Select value={form.category_id} onValueChange={(v) => setF("category_id", v ?? form.category_id)}>
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Item Name *</label>
                <Input className="mt-1" placeholder="e.g. Nasi Lemak" value={form.name} onChange={(e) => setF("name", e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Description</label>
                <Textarea className="mt-1 resize-none" rows={2} placeholder="Short description..." value={form.description} onChange={(e) => setF("description", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">SKU</label>
                <Input className="mt-1" placeholder="e.g. NL-001" value={form.sku} onChange={(e) => setF("sku", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700">Pricing</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Selling Price *</label>
                <Input type="number" min="0" step="0.01" className="mt-1" placeholder="0.00" value={form.price} onChange={(e) => setF("price", e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Cost Price</label>
                <Input type="number" min="0" step="0.01" className="mt-1" placeholder="0.00" value={form.cost} onChange={(e) => setF("cost", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700">Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Prep Time (minutes)</label>
                <Input type="number" min="0" className="mt-1" placeholder="e.g. 15" value={form.prep_time} onChange={(e) => setF("prep_time", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Calories (kcal)</label>
                <Input type="number" min="0" className="mt-1" placeholder="e.g. 450" value={form.calories} onChange={(e) => setF("calories", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700">Dietary Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {DIETARY_FIELDS.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleDietary(key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      dietary[key]
                        ? "bg-[#5C432B] text-white border-[#5C432B]"
                        : "bg-white text-gray-600 border-gray-200 hover:border-[#5C432B]/30"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" className="gap-2" disabled={saving || !form.name || !form.category_id || !form.price}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <Save className="w-4 h-4" /> Save Item
            </Button>
            <Link href={`/dashboard/menu/${outletId}`}>
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
