"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Truck, ShoppingCart, ChefHat, AlertTriangle, Loader2 } from "lucide-react";

interface Outlet { id: number; name: string; }
interface Ingredient { id: number; current_stock: number; reorder_level: number; }

const HUB_CARDS = [
  {
    title: "Ingredients",
    description: "Manage ingredient catalog, stock levels and categories",
    href: "/dashboard/inventory/ingredients",
    icon: Package,
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    title: "Purchase Orders",
    description: "Create and receive purchase orders from vendors",
    href: "/dashboard/inventory/purchase-orders",
    icon: ShoppingCart,
    color: "bg-amber-50 text-amber-600",
  },
  {
    title: "Vendors",
    description: "Manage supplier contacts and lead times",
    href: "/dashboard/inventory/vendors",
    icon: Truck,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "Recipes",
    description: "Link menu items to ingredient usage for cost tracking",
    href: "/dashboard/inventory/recipes",
    icon: ChefHat,
    color: "bg-purple-50 text-purple-600",
  },
];

export default function InventoryHubPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outletId, setOutletId] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/outlets")
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setOutlets(list);
        if (list.length > 0) setOutletId(String(list[0].id));
      });
  }, []);

  useEffect(() => {
    if (!outletId) return;
    setLoading(true);
    fetch(`/api/inventory/ingredients?outlet_id=${outletId}`)
      .then((r) => r.json())
      .then((d) => { setIngredients(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [outletId]);

  const lowStockCount = ingredients.filter(
    (i) => parseFloat(String(i.current_stock)) <= parseFloat(String(i.reorder_level))
  ).length;

  return (
    <div>
      <Header title="Inventory" subtitle="Manage stock, purchases, vendors and recipes" />
      <div className="p-6 space-y-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading stock data...
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {lowStockCount > 0 && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span>
                  <strong>{lowStockCount}</strong> ingredient{lowStockCount !== 1 ? "s" : ""} below reorder level
                  {outlets.length > 1 && outletId && (
                    <span className="ml-1 text-red-500">
                      ({outlets.find((o) => String(o.id) === outletId)?.name})
                    </span>
                  )}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">
              <Package className="w-4 h-4 flex-shrink-0" />
              <span>Expiry alerts — coming soon</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {HUB_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.href} href={card.href}>
                <Card className="border-gray-200 shadow-none hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group">
                  <CardContent className="p-6">
                    <div className={`inline-flex p-3 rounded-xl mb-4 ${card.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">
                      {card.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">{card.description}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
