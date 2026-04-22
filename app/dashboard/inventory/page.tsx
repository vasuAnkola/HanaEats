"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { FlaskConical, Truck, ShoppingCart, ChefHat, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

interface IngredientRow { stock_quantity: string; low_stock_threshold: string; }

export default function InventoryPage() {
  const [ingredients, setIngredients] = useState<IngredientRow[] | null>(null);

  useEffect(() => {
    fetch("/api/inventory/ingredients").then(r => r.json()).then((d) => {
      setIngredients(Array.isArray(d) ? d : []);
    });
  }, []);

  const total = ingredients?.length ?? 0;
  const lowStock = ingredients?.filter(i =>
    parseFloat(String(i.stock_quantity)) <= parseFloat(String(i.low_stock_threshold)) &&
    parseFloat(String(i.low_stock_threshold)) > 0
  ).length ?? 0;

  const cards = [
    { href: "/dashboard/inventory/ingredients", icon: FlaskConical, label: "Ingredients", desc: "Stock levels, cost per unit, adjustments", color: "text-indigo-600 bg-indigo-50 border-indigo-100", ring: "hover:border-indigo-300" },
    { href: "/dashboard/inventory/purchase-orders", icon: ShoppingCart, label: "Purchase Orders", desc: "Create POs, track delivery, receive stock", color: "text-amber-600 bg-amber-50 border-amber-100", ring: "hover:border-amber-300" },
    { href: "/dashboard/inventory/vendors", icon: Truck, label: "Vendors", desc: "Supplier contacts and details", color: "text-emerald-600 bg-emerald-50 border-emerald-100", ring: "hover:border-emerald-300" },
    { href: "/dashboard/inventory/recipes", icon: ChefHat, label: "Recipes", desc: "Ingredient usage per menu item, cost per dish", color: "text-rose-600 bg-rose-50 border-rose-100", ring: "hover:border-rose-300" },
  ];

  return (
    <div>
      <Header title="Inventory" subtitle="Stock management, vendors, purchase orders and recipes" />
      <div className="p-6 space-y-6">
        {ingredients === null ? (
          <Skeleton className="h-12 w-full rounded-xl" />
        ) : lowStock > 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-800 font-medium">
              {lowStock} ingredient{lowStock > 1 ? "s" : ""} below low-stock threshold.{" "}
              <Link href="/dashboard/inventory/ingredients" className="underline">View ingredients</Link>
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map(c => (
            <Link key={c.href} href={c.href}
              className={"border rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-all group " + c.ring}>
              <div className={"w-11 h-11 rounded-xl flex items-center justify-center mb-4 border " + c.color}>
                <c.icon className="w-5 h-5" />
              </div>
              <p className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">{c.label}</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{c.desc}</p>
            </Link>
          ))}
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center gap-6 text-sm text-gray-500">
          {ingredients === null ? (
            <><Skeleton className="h-4 w-32 rounded" /><Skeleton className="h-4 w-24 rounded" /></>
          ) : (
            <>
              <span><strong className="text-gray-900">{total}</strong> ingredients tracked</span>
              {lowStock > 0 && <span className="text-amber-600 font-medium"><strong>{lowStock}</strong> low stock</span>}
              {lowStock === 0 && total > 0 && <span className="text-emerald-600 font-medium">All stock levels healthy</span>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}