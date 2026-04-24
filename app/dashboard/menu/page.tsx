"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Store, UtensilsCrossed, Loader2, ArrowRight, ChefHat } from "lucide-react";

interface Outlet {
  id: number;
  name: string;
  outlet_type: string;
  is_active: boolean;
}

const TYPE_LABEL: Record<string, string> = {
  restaurant: "Restaurant", cafe: "Cafe", bakery: "Bakery",
  food_truck: "Food Truck", hawker: "Hawker / Food Court", qsr: "QSR",
  cloud_kitchen: "Cloud Kitchen", bar: "Bar / Lounge",
  tea_house: "Tea House", juice_shop: "Juice Shop",
};

export default function MenuHubPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/outlets")
      .then((r) => r.json())
      .then((d) => { setOutlets(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  return (
    <div>
      <Header title="Menu" subtitle="Select an outlet to manage its menu" />
      <div className="p-6 space-y-6">

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-blue-300" />
          </div>
        ) : outlets.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
              <UtensilsCrossed className="w-8 h-8 text-blue-300" />
            </div>
            <p className="text-gray-700 font-semibold text-base">No outlets yet</p>
            <p className="text-sm text-gray-400 mt-1 mb-5">Create an outlet first before managing menus.</p>
            <Link href="/dashboard/outlets/new">
              <Button className="gap-2"><Store className="w-4 h-4" /> Add Outlet</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {outlets.map((o) => (
              <Link key={o.id} href={`/dashboard/menu/${o.id}`}>
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group p-5">
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                      <Store className="w-6 h-6 text-white" />
                    </div>
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ring-1 ${
                      o.is_active
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        : "bg-gray-100 text-gray-500 ring-gray-200"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${o.is_active ? "bg-emerald-500" : "bg-gray-400"}`} />
                      {o.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="font-bold text-gray-900 text-base">{o.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{TYPE_LABEL[o.outlet_type] ?? o.outlet_type}</p>
                  <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 group-hover:gap-2.5 transition-all">
                      <ChefHat className="w-3.5 h-3.5" /> Manage Menu
                    </div>
                    <div className="w-7 h-7 rounded-full bg-blue-50 group-hover:bg-blue-600 flex items-center justify-center transition-colors">
                      <ArrowRight className="w-3.5 h-3.5 text-blue-400 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
