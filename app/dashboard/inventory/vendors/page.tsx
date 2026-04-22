"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Loader2, Plus, Pencil, Trash2, Phone, Mail } from "lucide-react";

interface Vendor {
  id: number; name: string; contact_name: string | null;
  phone: string | null; email: string | null; address: string | null;
  notes: string | null; is_active: boolean;
}

const empty = { name: "", contact_name: "", phone: "", email: "", address: "", notes: "" };

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[] | null>(null);
  const [dialog, setDialog] = useState<"add" | "edit" | null>(null);
  const [selected, setSelected] = useState<Vendor | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(empty);

  const load = useCallback(async () => {
    const res = await fetch("/api/inventory/vendors");
    const data = await res.json();
    setVendors(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() { setForm(empty); setError(""); setDialog("add"); }
  function openEdit(v: Vendor) {
    setSelected(v);
    setForm({ name: v.name, contact_name: v.contact_name ?? "", phone: v.phone ?? "", email: v.email ?? "", address: v.address ?? "", notes: v.notes ?? "" });
    setError(""); setDialog("edit");
  }

  async function save() {
    setSaving(true); setError("");
    const url = dialog === "edit" ? "/api/inventory/vendors/" + selected!.id : "/api/inventory/vendors";
    const res = await fetch(url, { method: dialog === "edit" ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed"); setSaving(false); return; }
    setDialog(null); setSaving(false); load();
  }

  async function del(id: number) {
    if (!confirm("Delete this vendor?")) return;
    await fetch("/api/inventory/vendors/" + id, { method: "DELETE" });
    load();
  }

  const columns: Column<Vendor>[] = [
    {
      key: "name", label: "Vendor", sortable: true,
      render: v => (
        <div>
          <p className="font-medium text-gray-900 text-sm">{v.name}</p>
          {v.contact_name && <p className="text-[11px] text-gray-400 mt-0.5">{v.contact_name}</p>}
        </div>
      ),
    },
    {
      key: "phone", label: "Contact",
      render: v => (
        <div className="space-y-0.5">
          {v.phone && <p className="flex items-center gap-1.5 text-xs text-gray-600"><Phone className="w-3 h-3 text-gray-400" />{v.phone}</p>}
          {v.email && <p className="flex items-center gap-1.5 text-xs text-gray-600"><Mail className="w-3 h-3 text-gray-400" />{v.email}</p>}
          {!v.phone && !v.email && <span className="text-xs text-gray-400">—</span>}
        </div>
      ),
    },
    {
      key: "address", label: "Address",
      render: v => <span className="text-sm text-gray-500">{v.address ?? "—"}</span>,
    },
    {
      key: "actions", label: "",
      render: v => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-indigo-600" onClick={() => openEdit(v)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-red-500" onClick={() => del(v.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Header title="Vendors" subtitle="Manage suppliers and contact details" />
      <div className="p-6">
        <div className="flex justify-end mb-6">
          <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={openAdd}>
            <Plus className="w-4 h-4" /> Add Vendor
          </Button>
        </div>

        {vendors === null ? (
          <TableSkeleton rows={5} cols={4} />
        ) : (
          <DataTable data={vendors} columns={columns} searchKeys={["name","contact_name","email"]} searchPlaceholder="Search vendors..." pageSize={25} emptyMessage="No vendors yet. Add your first supplier." />
        )}
      </div>

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{dialog === "edit" ? "Edit Vendor" : "Add Vendor"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Vendor Name</label>
              <Input placeholder="e.g. Fresh Farm Co." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Contact Person</label>
              <Input placeholder="Full name" value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Phone</label>
                <Input placeholder="+60..." value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Email</label>
                <Input type="email" placeholder="vendor@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Address</label>
              <Input placeholder="Street address..." value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Notes</label>
              <Input placeholder="Any additional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={save} disabled={saving || !form.name}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />} {dialog === "edit" ? "Save Changes" : "Add Vendor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}