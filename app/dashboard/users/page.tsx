"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Pencil, Trash2, UserPlus, Loader2 } from "lucide-react";
import Link from "next/link";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface User {
  id: number; name: string; email: string; role: string;
  is_active: boolean; last_login_at: string | null; created_at: string;
}
interface Outlet { id: number; name: string; }

const ROLE_BADGE: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700", admin: "bg-blue-100 text-blue-700",
  manager: "bg-green-100 text-green-700", cashier: "bg-[#5C432B]/10 text-[#5C432B]",
  waiter: "bg-yellow-100 text-yellow-700", kitchen: "bg-red-100 text-red-700",
};
const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin", admin: "Admin", manager: "Manager",
  cashier: "Cashier", waiter: "Waiter", kitchen: "Kitchen",
};
const ROLES = ["admin","manager","cashier","waiter","kitchen"];

const emptyForm = { name: "", email: "", role: "cashier", outlet_id: "", is_active: true, password: "" };

export default function UsersPage() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [dialog, setDialog] = useState<"edit" | null>(null);
  const [selected, setSelected] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmUser, setConfirmUser] = useState<User | null>(null);

  const load = () => fetch("/api/users").then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : []));

  useEffect(() => {
    load();
    fetch("/api/outlets").then(r => r.json()).then(d => setOutlets(Array.isArray(d) ? d : []));
    // Check session — try nextauth session endpoint, fall back to showing controls
    fetch("/api/auth/session")
      .then(r => r.ok ? r.json() : null)
      .then(s => {
        if (s?.user?.role && ["super_admin","admin"].includes(s.user.role)) setCanManage(true);
        else setCanManage(true); // show controls, server will 403 if not allowed
      })
      .catch(() => setCanManage(true));
  }, []);

  function openEdit(u: User) {
    setSelected(u);
    setForm({ name: u.name, email: u.email, role: u.role, outlet_id: "", is_active: u.is_active, password: "" });
    setError(""); setDialog("edit");
  }

  async function save() {
    setSaving(true); setError("");
    const body: Record<string, unknown> = { name: form.name, email: form.email, role: form.role, is_active: form.is_active };
    if (form.outlet_id) body.outlet_id = parseInt(form.outlet_id);
    if (form.password) body.password = form.password;
    const res = await fetch("/api/users/" + selected!.id, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed"); setSaving(false); return; }
    setDialog(null); setSaving(false); load();
  }

  async function del(u: User) {
    setConfirmUser(u);
  }

  async function confirmDel() {
    if (!confirmUser) return;
    await fetch("/api/users/" + confirmUser.id, { method: "DELETE" });
    setConfirmUser(null);
    load();
  }

  const columns: Column<User>[] = [
    { key: "name", label: "Name", sortable: true, render: u => (
      <div><p className="font-medium text-gray-900">{u.name}</p><p className="text-xs text-gray-400">{u.email}</p></div>
    )},
    { key: "role", label: "Role", sortable: true, render: u => (
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ROLE_BADGE[u.role] ?? "bg-gray-100 text-gray-600"}`}>{ROLE_LABEL[u.role] ?? u.role}</span>
    )},
    { key: "is_active", label: "Status", render: u => (
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>{u.is_active ? "Active" : "Inactive"}</span>
    )},
    { key: "last_login_at", label: "Last Login", render: u => (
      <span className="text-sm text-gray-500">{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : <span className="text-gray-300">Never</span>}</span>
    )},
    { key: "created_at", label: "Joined", sortable: true, render: u => (
      <span className="text-sm text-gray-500">{new Date(u.created_at).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</span>
    )},
    { key: "actions", label: "", render: u => canManage ? (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-indigo-600" onClick={() => openEdit(u)}><Pencil className="w-3.5 h-3.5" /></Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-red-500" onClick={() => del(u)}><Trash2 className="w-3.5 h-3.5" /></Button>
      </div>
    ) : null },
  ];

  return (
    <div>
      <ConfirmDialog open={confirmUser !== null} title="Delete User" description={confirmUser ? `Delete "${confirmUser.name}"? This cannot be undone.` : ""} onConfirm={confirmDel} onCancel={() => setConfirmUser(null)} />
      <Header title="Team" subtitle="Manage staff accounts and roles" />
      <div className="p-6">
        {canManage && (
          <div className="flex justify-end mb-6">
            <Link href="/dashboard/users/new">
              <Button type="submit"><UserPlus className="w-4 h-4" /> Add User</Button>
            </Link>
          </div>
        )}
        {users === null ? <TableSkeleton rows={6} cols={5} /> : (
          <DataTable data={users} columns={columns} searchKeys={["name","email","role"]} searchPlaceholder="Search users..." pageSize={15} emptyMessage="No users found." />
        )}
      </div>

      <Dialog open={dialog === "edit"} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Name</label>
              <Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} /></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Email</label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Role</label>
                <Select value={form.role} onValueChange={v => v && setForm(f => ({...f, role: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABEL[r] ?? r}</SelectItem>)}</SelectContent>
                </Select></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Status</label>
                <Select value={form.is_active ? "active" : "inactive"} onValueChange={v => v && setForm(f => ({...f, is_active: v === "active"}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                </Select></div>
            </div>
            {outlets.length > 0 && (
              <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Outlet (optional)</label>
                <Select value={form.outlet_id || "none"} onValueChange={v => { if (v) setForm(f => ({...f, outlet_id: v === "none" ? "" : v})); }}>
                  <SelectTrigger><SelectValue placeholder="Any outlet" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Any outlet</SelectItem>
                    {outlets.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select></div>
            )}
            <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">New Password (leave blank to keep)</label>
              <Input type="password" placeholder="Min 8 characters" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={save} disabled={saving || !form.name || !form.email}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />} Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}