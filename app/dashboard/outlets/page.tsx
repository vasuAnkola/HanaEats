"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import Link from "next/link";
import { Plus, Store, Loader2, MapPin, Phone, ToggleLeft, ToggleRight, Pencil } from "lucide-react";

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
  restaurant: "Restaurant",
  cafe: "Cafe",
  bakery: "Bakery",
  food_truck: "Food Truck",
  hawker: "Hawker / Food Court",
  qsr: "QSR",
  cloud_kitchen: "Cloud Kitchen",
  bar: "Bar / Lounge",
  tea_house: "Tea House",
  juice_shop: "Juice Shop",
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
        if (s?.user?.role && ["super_admin", "admin"].includes(s.user.role)) {
          setCanCreate(true);
        }
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

  const columns: Column<Outlet>[] = [
    {
      key: "name",
      label: "Outlet",
      sortable: true,
      render: (o) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <Store className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{o.name}</p>
            <p className="text-xs text-gray-400">{TYPE_LABEL[o.outlet_type] ?? o.outlet_type}</p>
          </div>
        </div>
      ),
    },
    {
      key: "address",
      label: "Address",
      render: (o) => o.address ? (
        <span className="text-sm text-gray-500 flex items-center gap-1">
          <MapPin className="w-3 h-3 flex-shrink-0" /> {o.address}
        </span>
      ) : <span className="text-gray-300 text-sm">—</span>,
    },
    {
      key: "phone",
      label: "Phone",
      render: (o) => o.phone ? (
        <span className="text-sm text-gray-500 flex items-center gap-1">
          <Phone className="w-3 h-3 flex-shrink-0" /> {o.phone}
        </span>
      ) : <span className="text-gray-300 text-sm">—</span>,
    },
    {
      key: "is_active",
      label: "Status",
      render: (o) => (
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${o.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
          {o.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "Created",
      sortable: true,
      render: (o) => (
        <span className="text-sm text-gray-500">
          {new Date(o.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "w-24",
      render: (o) => (
        <div className="flex items-center gap-1 justify-end">
          <Link href={`/dashboard/outlets/${o.id}/edit`}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50" title="Edit">
              <Pencil className="w-4 h-4" />
            </Button>
          </Link>
          <Button
            variant="ghost" size="sm"
            className="h-8 w-8 p-0 text-gray-400 hover:text-green-600 hover:bg-green-50"
            title={o.is_active ? "Deactivate" : "Activate"}
            onClick={() => toggleActive(o)}
            disabled={actionId === o.id}
          >
            {actionId === o.id
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : o.is_active
                ? <ToggleRight className="w-4 h-4 text-green-500" />
                : <ToggleLeft className="w-4 h-4" />
            }
          </Button>
        </div>
      ),
    },
  ];

  const toolbar = canCreate ? (
    <Link href="/dashboard/outlets/new">
      <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 h-9">
        <Plus className="w-4 h-4" /> Add Outlet
      </Button>
    </Link>
  ) : undefined;

  return (
    <div>
      <Header title="Outlets" subtitle={`${outlets.length} branch${outlets.length !== 1 ? "es" : ""}`} />
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        ) : (
          <DataTable
            data={outlets}
            columns={columns}
            searchKeys={["name", "address", "phone", "outlet_type"]}
            searchPlaceholder="Search outlets..."
            pageSize={10}
            emptyMessage="No outlets found."
            toolbar={toolbar}
          />
        )}
      </div>
    </div>
  );
}
