"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Pencil, Trash2, UserPlus, Loader2, Eye, EyeOff } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface User {
  id: number; name: string; email: string; role: string;
  is_active: boolean; last_login_at: string | null; created_at: string;
}
interface Outlet { id: number; name: string; }

const ROLE_BADGE: Record<string, string> = {
  super_admin: "bg-purple-50 text-purple-700 ring-purple-200",
  admin:       "bg-blue-50 text-blue-700 ring-blue-200",
  manager:     "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cashier:     "bg-amber-50 text-amber-700 ring-amber-200",
  waiter:      "bg-sky-50 text-sky-700 ring-sky-200",
  kitchen:     "bg-red-50 text-red-700 ring-red-200",
};

const ROLE_AVATAR = "bg-gradient-to-br from-[#1E3A5F] to-[#2563EB]";

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
  const [dialog, setDialog] = useState<"add" | "edit" | null>(null);
  const [selected, setSelected] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmUser, setConfirmUser] = useState<User | null>(null);

  const [showPassword, setShowPassword] = useState(false);

  const load = () => fetch("/api/users").then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : []));

  useEffect(() => {
    load();
    fetch("/api/outlets").then(r => r.json()).then(d => setOutlets(Array.isArray(d) ? d : []));
    fetch("/api/auth/session")
      .then(r => r.ok ? r.json() : null)
      .then(s => { setCanManage(true); })
      .catch(() => setCanManage(true));
  }, []);

  function openAdd() {
    setForm(emptyForm);
    setError(""); setDialog("add");
  }

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
    
    const url = dialog === "add" ? "/api/users" : "/api/users/" + selected!.id;
    const method = dialog === "add" ? "POST" : "PATCH";
    
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed"); setSaving(false); return; }
    setDialog(null); setSaving(false); load();
  }

  async function confirmDel() {
    if (!confirmUser) return;
    await fetch("/api/users/" + confirmUser.id, { method: "DELETE" });
    setConfirmUser(null);
    load();
  }


  const columns: Column<User>[] = [
    {
      key: "name", label: "User", sortable: true,
      render: u => (
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${ROLE_AVATAR}`}>
            <span className="text-xs font-bold text-white">{u.name.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{u.name}</p>
            <p className="text-[11px] text-gray-400">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role", label: "Role", sortable: true,
      render: u => (
        <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full ring-1 ${ROLE_BADGE[u.role] ?? "bg-gray-50 text-gray-600 ring-gray-200"}`}>
          {ROLE_LABEL[u.role] ?? u.role}
        </span>
      ),
    },
    {
      key: "is_active", label: "Status",
      render: u => (
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ${
          u.is_active ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-red-50 text-red-600 ring-red-200"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? "bg-emerald-500" : "bg-red-400"}`} />
          {u.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "last_login_at", label: "Last Login",
      render: u => (
        <span className="text-xs text-gray-500">
          {u.last_login_at
            ? new Date(u.last_login_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
            : <span className="text-gray-300">Never</span>}
        </span>
      ),
    },
    {
      key: "created_at", label: "Joined", sortable: true,
      render: u => (
        <span className="text-xs text-gray-400">
          {new Date(u.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
      ),
    },
    {
      key: "actions", label: "",
      render: u => canManage ? (
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => openEdit(u)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50" onClick={() => setConfirmUser(u)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : null,
    },
  ];

  return (
    <div>
      <ConfirmDialog
        open={confirmUser !== null}
        title="Delete User"
        description={confirmUser ? `Delete "${confirmUser.name}"? This cannot be undone.` : ""}
        onConfirm={confirmDel}
        onCancel={() => setConfirmUser(null)}
      />
      <Header title="Team" subtitle="Manage staff accounts and roles" />
      <div className="p-6 space-y-6">

        {/* Table card */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">All Users</p>
              <p className="text-xs text-gray-400 mt-0.5">{(users ?? []).length} staff member{(users ?? []).length !== 1 ? "s" : ""}</p>
            </div>
            {canManage && (
              <Button className="gap-2 h-9" onClick={openAdd}>
                <UserPlus className="w-4 h-4" /> Add User
              </Button>
            )}
          </div>
          <div className="p-4">
            {users === null ? <TableSkeleton rows={6} cols={5} /> : (
              <DataTable
                data={users}
                columns={columns}
                searchKeys={["name","email","role"]}
                searchPlaceholder="Search users..."
                pageSize={15}
                emptyMessage="No users found."
              />
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialog === "add" || dialog === "edit"} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            {dialog === "edit" ? (
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${ROLE_AVATAR}`}>
                  <span className="text-sm font-bold text-white">{selected?.name.charAt(0).toUpperCase()}</span>
                </div>
                <DialogTitle>Edit User</DialogTitle>
              </div>
            ) : (
              <DialogTitle>Add New User</DialogTitle>
            )}
          </DialogHeader>
          <div className="space-y-4 py-1">
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Name</label>
              <Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Email</label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Role</label>
                <Select value={form.role} onValueChange={v => v && setForm(f => ({...f, role: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABEL[r] ?? r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Status</label>
                <Select value={form.is_active ? "active" : "inactive"} onValueChange={v => v && setForm(f => ({...f, is_active: v === "active"}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {outlets.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Outlet (optional)</label>
                <Select value={form.outlet_id || "none"} onValueChange={v => { if (v) setForm(f => ({...f, outlet_id: v === "none" ? "" : v})); }}>
                  <SelectTrigger><SelectValue placeholder="Any outlet" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Any outlet</SelectItem>
                    {outlets.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
    <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Password {dialog === "edit" && <span className="text-gray-400 font-normal">(leave blank to keep)</span>}</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 8 characters"
                  value={form.password}
                  onChange={e => setForm(f => ({...f, password: e.target.value}))}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !form.name || !form.email || (dialog === "add" && !form.password)}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />} {dialog === "edit" ? "Save Changes" : "Add User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
