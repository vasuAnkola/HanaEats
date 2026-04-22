"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import Link from "next/link";
import { Plus, Building2, Eye, Pencil, Trash2, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";

interface Tenant {
  id: number; name: string; slug: string; email: string; phone: string | null;
  plan: string; is_active: boolean; country_name: string; currency_code: string;
  outlet_count: string; user_count: string; created_at: string;
}

const PLAN_BADGE: Record<string, string> = {
  starter: "bg-gray-100 text-gray-600",
  pro: "bg-blue-100 text-blue-700",
  enterprise: "bg-purple-100 text-purple-700",
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/tenants");
    const data = await res.json();
    setTenants(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(t: Tenant) {
    setActionId(t.id);
    await fetch(`/api/tenants/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: !t.is_active }) });
    await load(); setActionId(null);
  }

  async function deleteTenant(id: number) {
    setActionId(id); setError("");
    const res = await fetch(`/api/tenants/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed to delete"); setActionId(null); setDeleteConfirm(null); return; }
    await load(); setActionId(null); setDeleteConfirm(null);
  }

  const columns: Column<Tenant>[] = [
    {
      key: "name", label: "Business", sortable: true,
      render: (t) => (
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${t.is_active ? "bg-[#5C432B]/10" : "bg-gray-100"}`}>
            <Building2 className={`w-4 h-4 ${t.is_active ? "text-indigo-600" : "text-gray-400"}`} />
          </div>
          <div>
            <p className="font-medium text-gray-900">{t.name}</p>
            <p className="text-xs text-gray-400 font-mono">/{t.slug}</p>
          </div>
        </div>
      ),
    },
    { key: "country_name", label: "Country", sortable: true, render: (t) => <div><p className="text-sm text-gray-700">{t.country_name}</p><p className="text-xs text-gray-400">{t.currency_code}</p></div> },
    { key: "plan", label: "Plan", sortable: true, render: (t) => <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${PLAN_BADGE[t.plan] ?? "bg-gray-100 text-gray-600"}`}>{t.plan}</span> },
    { key: "outlet_count", label: "Outlets", render: (t) => <span className="text-sm text-gray-700">{t.outlet_count}</span> },
    { key: "user_count", label: "Users", render: (t) => <span className="text-sm text-gray-700">{t.user_count}</span> },
    { key: "is_active", label: "Status", render: (t) => <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>{t.is_active ? "Active" : "Inactive"}</span> },
    {
      key: "actions", label: "", className: "w-36",
      render: (t) => (
        <div className="flex items-center gap-1 justify-end">
          <Link href={`/dashboard/tenants/${t.id}`}><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50"><Eye className="w-4 h-4" /></Button></Link>
          <Link href={`/dashboard/tenants/${t.id}/edit`}><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-[#5C432B] hover:bg-[#5C432B]/10"><Pencil className="w-4 h-4" /></Button></Link>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-green-600 hover:bg-green-50" onClick={() => toggleActive(t)} disabled={actionId === t.id}>
            {actionId === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : t.is_active ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4" />}
          </Button>
          {deleteConfirm === t.id ? (
            <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
              <span className="text-xs text-red-600 font-medium">Delete?</span>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-red-600 hover:bg-red-100" onClick={() => deleteTenant(t.id)} disabled={actionId === t.id}>{actionId === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Yes"}</Button>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-gray-500 hover:bg-gray-100" onClick={() => setDeleteConfirm(null)}>No</Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50" onClick={() => { setError(""); setDeleteConfirm(t.id); }}><Trash2 className="w-4 h-4" /></Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <Header />
      <div className="p-6">
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>}
        {loading ? <TableSkeleton rows={6} cols={6} /> : (
          <DataTable data={tenants} columns={columns} searchKeys={["name", "slug", "email", "country_name"]} searchPlaceholder="Search tenants..." pageSize={10} emptyMessage="No tenants found."
            toolbar={<Link href="/dashboard/tenants/new"><Button className="gap-2 h-9"><Plus className="w-4 h-4" /> Add Tenant</Button></Link>}
          />
        )}
      </div>
    </div>
  );
}
