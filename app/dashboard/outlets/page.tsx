"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import Link from "next/link";
import { Plus, Store, Loader2, MapPin, Phone, Pencil, CheckCircle, XCircle } from "lucide-react";

interface Outlet {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  outlet_type: string;
  is_active: boolean;
  created_at: string;
}

const TYPE_LABEL: Record<string, string> = {
  restaurant: "Restaurant", cafe: "Cafe", bakery: "Bakery",
  food_truck: "Food Truck", hawker: "Hawker / Food Court", qsr: "QSR",
  cloud_kitchen: "Cloud Kitchen", bar: "Bar / Lounge",
  tea_house: "Tea House", juice_shop: "Juice Shop",
};

const TYPE_COLOR: Record<string, string> = {
  restaurant: "bg-blue-50 text-blue-700 ring-blue-200",
  cafe: "bg-amber-50 text-amber-700 ring-amber-200",
  bakery: "bg-orange-50 text-orange-700 ring-orange-200",
  food_truck: "bg-violet-50 text-violet-700 ring-violet-200",
  hawker: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  qsr: "bg-red-50 text-red-700 ring-red-200",
  cloud_kitchen: "bg-sky-50 text-sky-700 ring-sky-200",
  bar: "bg-purple-50 text-purple-700 ring-purple-200",
  tea_house: "bg-teal-50 text-teal-700 ring-teal-200",
  juice_shop: "bg-lime-50 text-lime-700 ring-lime-200",
};

export default function OutletsPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [canCreate, setCanCreate] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);

  async function load() {
    const res = await fetch("/api/outlets");
    const data = await res.json();
    setOutlets(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => {
        if (s?.user?.role && ["super_admin", "admin"].includes(s.user.role)) setCanCreate(true);
      });
  }, []);

  async function toggleActive(o: Outlet) {
    setActionId(o.id);
    await fetch(`/api/outlets/${o.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !o.is_active }),
    });
    await load();
    setActionId(null);
  }

  const activeCount = outlets.filter(o => o.is_active).length;
  const inactiveCount = outlets.filter(o => !o.is_active).length;

  const columns: Column<Outlet>[] = [
    {
      key: "name", label: "Outlet", sortable: true,
      render: (o) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{o.name}</p>
            <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1 mt-0.5 ${TYPE_COLOR[o.outlet_type] ?? "bg-gray-50 text-gray-600 ring-gray-200"}`}>
              {TYPE_LABEL[o.outlet_type] ?? o.outlet_type}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "address", label: "Address",
      render: (o) => o.address ? (
        <div className="flex items-start gap-1.5 max-w-xs">
          <MapPin className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-gray-600 leading-snug">{o.address}</span>
        </div>
      ) : <span className="text-gray-300 text-sm">—</span>,
    },
    {
      key: "phone", label: "Phone",
      render: (o) => o.phone ? (
        <div className="flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          <span className="text-sm text-gray-600">{o.phone}</span>
        </div>
      ) : <span className="text-gray-300 text-sm">—</span>,
    },
    {
      key: "is_active", label: "Status",
      render: (o) => (
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ${
          o.is_active ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-red-50 text-red-600 ring-red-200"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${o.is_active ? "bg-emerald-500" : "bg-red-400"}`} />
          {o.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "created_at", label: "Created", sortable: true,
      render: (o) => (
        <span className="text-xs text-gray-400">
          {new Date(o.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
      ),
    },
    {
      key: "actions", label: "", className: "w-36",
      render: (o) => (
        <div className="flex items-center gap-2 justify-end">
          <Link href={`/dashboard/outlets/${o.id}/edit`}>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 px-3 text-xs">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
          </Link>
          <button
            onClick={() => toggleActive(o)}
            disabled={actionId === o.id}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
              o.is_active ? "bg-emerald-500" : "bg-gray-300"
            }`}
          >
            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
              o.is_active ? "translate-x-5" : "translate-x-0.5"
            }`}>
              {actionId === o.id && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
            </span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Header title="Outlets" subtitle="Manage your branches and locations" />
      <div className="p-6 space-y-6">

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-blue-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Store className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{outlets.length}</p>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">Total Outlets</p>
            </div>
          </div>
          <div className="bg-white border border-emerald-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{activeCount}</p>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">Active</p>
            </div>
          </div>
          <div className="bg-white border border-red-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-red-400 flex items-center justify-center flex-shrink-0">
              <XCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{inactiveCount}</p>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">Inactive</p>
            </div>
          </div>
        </div>

        {/* Table card */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">All Outlets</p>
              <p className="text-xs text-gray-400 mt-0.5">{outlets.length} branch{outlets.length !== 1 ? "es" : ""} registered</p>
            </div>
            {canCreate && (
              <Link href="/dashboard/outlets/new">
                <Button className="gap-2 h-9">
                  <Plus className="w-4 h-4" /> Add Outlet
                </Button>
              </Link>
            )}
          </div>
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-blue-300" />
              </div>
            ) : (
              <DataTable
                data={outlets}
                columns={columns}
                searchKeys={["name", "address", "phone", "outlet_type"]}
                searchPlaceholder="Search outlets..."
                pageSize={10}
                emptyMessage="No outlets found."
              />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
