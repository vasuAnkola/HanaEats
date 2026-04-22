"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Store, UtensilsCrossed, Loader2, ArrowRight } from "lucide-react";

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
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        ) : outlets.length === 0 ? (
          <Card className="border-gray-200 shadow-none">
            <CardContent className="py-16 text-center">
              <UtensilsCrossed className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No outlets yet</p>
              <p className="text-sm text-gray-400 mt-1">Create an outlet first before managing menus.</p>
              <Link href="/dashboard/outlets/new">
                <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white">Add Outlet</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {outlets.map((o) => (
              <Link key={o.id} href={`/dashboard/menu/${o.id}`}>
                <Card className="border-gray-200 shadow-none hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                        <Store className="w-5 h-5 text-indigo-600" />
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${o.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {o.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-900">{o.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{TYPE_LABEL[o.outlet_type] ?? o.outlet_type}</p>
                    <div className="mt-4 flex items-center gap-1 text-xs font-medium text-indigo-600 group-hover:gap-2 transition-all">
                      Manage Menu <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
