"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";

interface Vendor {
  id: number; name: string; contact_name: string | null; phone: string | null;
  email: string | null; address: string | null; lead_time_days: number;
}

const EMPTY_FORM = {
  name: "", contact_name: "", phone: "", email: "", address: "", lead_time_days: "1",
};

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Vendor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const loadVendors = useCallback(() => {
    setLoading(true);
    fetch("/api/inventory/vendors")
      .then((r) => r.json())
      .then((d) => { setVendors(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadVendors(); }, [loadVendors]);

  async function handleAdd() {
    if (!form.name) return;
    setSaving(true);
    await fetch("/api/inventory/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name, contact_name: form.contact_name || null,
        phone: form.phone || null, email: form.email || null,
        address: form.address || null,
        lead_time_days: parseInt(form.lead_time_days) || 1,
      }),
    });
    setSaving(false);
    setAddOpen(false);
    setForm({ ...EMPTY_FORM });
    loadVendors();
  }

  async function handleEdit() {
    if (!editTarget) return;
    setSaving(true);
    await fetch(`/api/inventory/vendors/${editTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name, contact_name: form.contact_name || null,
        phone: form.phone || null, email: form.email || null,
        address: form.address || null,
        lead_time_days: parseInt(form.lead_time_days) || 1,
      }),
    });
    setSaving(false);
    setEditOpen(false);
    setEditTarget(null);
    loadVendors();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    await fetch(`/api/inventory/vendors/${deleteTarget.id}`, { method: "DELETE" });
    setSaving(false);
    setDeleteOpen(false);
    setDeleteTarget(null);
    loadVendors();
  }

  function openEdit(row: Vendor) {
    setEditTarget(row);
    setForm({
      name: row.name, contact_name: row.contact_name ?? "",
      phone: row.phone ?? "", email: row.email ?? "",
      address: row.address ?? "",
      lead_time_days: String(row.lead_time_days),
    });
    setEditOpen(true);
  }

  const columns: Column<Vendor>[] = [
    { key: "name", label: "Name", sortable: true },
    { key: "contact_name", label: "Contact", render: (row) => row.contact_name || <span className="text-gray-400">—</span> },
    { key: "phone", label: "Phone", render: (row) => row.phone || <span className="text-gray-400">—</span> },
    { key: "email", label: "Email", render: (row) => row.email || <span className="text-gray-400">—</span> },
    { key: "lead_time_days", label: "Lead Time", render: (row) => `${row.lead_time_days} day${row.lead_time_days !== 1 ? "s" : ""}` },
    {
      key: "actions", label: "Actions",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => openEdit(row)}>
            <Pencil className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="outline" className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => { setDeleteTarget(row); setDeleteOpen(true); }}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Header title="Vendors" subtitle="Manage your suppliers and contacts" />
      <div className="p-6 space-y-4">
        <div className="flex justify-end">
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white h-9" onClick={() => { setForm({ ...EMPTY_FORM }); setAddOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Add Vendor
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        ) : (
          <DataTable
            data={vendors}
            columns={columns}
            searchKeys={["name", "contact_name", "email"]}
            searchPlaceholder="Search vendors..."
            emptyMessage="No vendors yet. Add your first vendor."
          />
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Vendor</DialogTitle></DialogHeader>
          <VendorForm form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleAdd} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Vendor</DialogTitle></DialogHeader>
          <VendorForm form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleEdit} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete Vendor</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600 py-2">Remove <strong>{deleteTarget?.name}</strong>? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VendorForm({
  form, setForm,
}: {
  form: typeof EMPTY_FORM;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>;
}) {
  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label>Company Name</Label>
        <Input placeholder="e.g. Fresh Farms Co." value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Contact Person</Label>
          <Input placeholder="John Smith" value={form.contact_name} onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input placeholder="+1 555 0100" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Email</Label>
        <Input type="email" placeholder="vendor@example.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
      </div>
      <div className="space-y-1.5">
        <Label>Address</Label>
        <Input placeholder="123 Supply Street" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
      </div>
      <div className="space-y-1.5">
        <Label>Lead Time (days)</Label>
        <Input type="number" min="1" placeholder="1" value={form.lead_time_days} onChange={(e) => setForm((f) => ({ ...f, lead_time_days: e.target.value }))} />
      </div>
    </div>
  );
}
