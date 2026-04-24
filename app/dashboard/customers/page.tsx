"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Loader2, Plus, Eye, Pencil, Star, TrendingUp, TrendingDown, Users, ShoppingBag, Award } from "lucide-react";

interface Customer {
  id: number; name: string; email: string | null; phone: string | null;
  loyalty_points: number; total_spent: number; visit_count: number;
  preferred_language: string; notes: string | null;
}
interface LoyaltyTx { id: number; type: string; points: number; balance_after: number; notes: string | null; created_at: string; }
interface CustomerDetail extends Customer { transactions: LoyaltyTx[]; }

const LANGUAGES = ["en","th","ms","id","vi"];
const LANG_LABEL: Record<string,string> = { en:"English", th:"Thai", ms:"Bahasa Malaysia", id:"Bahasa Indonesia", vi:"Vietnamese" };
const TX_COLOR: Record<string,string> = {
  earn: "bg-emerald-100 text-emerald-700",
  redeem: "bg-amber-100 text-amber-700",
  manual_add: "bg-blue-100 text-blue-700",
  manual_deduct: "bg-red-100 text-red-600",
  expire: "bg-gray-100 text-gray-500",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<"add"|"edit"|"detail"|"points"|null>(null);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name:"", email:"", phone:"", preferred_language:"en", notes:"" });
  const [pointsForm, setPointsForm] = useState({ action:"add_points", points:"0", notes:"" });

  useEffect(() => {
    fetch("/api/customers" + (search ? "?search=" + encodeURIComponent(search) : ""))
      .then(r => r.json()).then(d => setCustomers(Array.isArray(d) ? d : []));
  }, [search]);

  function openAdd() { setForm({ name:"", email:"", phone:"", preferred_language:"en", notes:"" }); setError(""); setDialog("add"); }
  function openEdit(c: Customer) { setSelected(c); setForm({ name:c.name, email:c.email??"", phone:c.phone??"", preferred_language:c.preferred_language, notes:c.notes??"" }); setError(""); setDialog("edit"); }
  async function openDetail(c: Customer) {
    setSelected(c);
    const res = await fetch("/api/customers/" + c.id);
    setDetail(await res.json()); setDialog("detail");
  }
  function openPoints(c: Customer) { setSelected(c); setPointsForm({ action:"add_points", points:"0", notes:"" }); setError(""); setDialog("points"); }

  async function save() {
    setSaving(true); setError("");
    const url = dialog === "edit" ? "/api/customers/" + selected!.id : "/api/customers";
    const res = await fetch(url, { method: dialog==="edit"?"PATCH":"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setError(data.error??"Failed"); setSaving(false); return; }
    setDialog(null); setSaving(false);
    fetch("/api/customers").then(r=>r.json()).then(d=>setCustomers(Array.isArray(d)?d:[]));
  }

  async function adjustPoints() {
    setSaving(true); setError("");
    const res = await fetch("/api/customers/" + selected!.id, {
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ action: pointsForm.action, points: parseInt(pointsForm.points)||0, notes: pointsForm.notes }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error??"Failed"); setSaving(false); return; }
    setDialog(null); setSaving(false);
    fetch("/api/customers").then(r=>r.json()).then(d=>setCustomers(Array.isArray(d)?d:[]));
  }

  const totalPoints = (customers ?? []).reduce((s, c) => s + c.loyalty_points, 0);
  const totalSpent = (customers ?? []).reduce((s, c) => s + parseFloat(String(c.total_spent)), 0);

  const columns: Column<Customer>[] = [
    { key:"name", label:"Customer", sortable:true, render: c => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-blue-600">{c.name.charAt(0).toUpperCase()}</span>
        </div>
        <div>
          <p className="font-medium text-gray-900 text-sm">{c.name}</p>
          {c.email && <p className="text-[11px] text-gray-400 mt-0.5">{c.email}</p>}
        </div>
      </div>
    )},
    { key:"phone", label:"Phone", render: c => <span className="text-sm text-gray-600">{c.phone ?? "—"}</span> },
    { key:"loyalty_points", label:"Points", sortable:true, render: c => (
      <div className="flex items-center gap-1.5">
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-2 py-0.5 flex items-center gap-1">
          <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
          <span className="text-xs font-bold text-amber-700">{c.loyalty_points}</span>
        </div>
      </div>
    )},
    { key:"total_spent", label:"Total Spent", sortable:true, render: c => (
      <span className="text-sm font-semibold text-blue-700">{parseFloat(String(c.total_spent)).toFixed(2)}</span>
    )},
    { key:"visit_count", label:"Visits", render: c => (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-600 text-xs font-bold">{c.visit_count}</span>
    )},
    { key:"actions", label:"", render: c => (
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1 border-amber-200 text-amber-600 hover:bg-amber-50" onClick={() => openPoints(c)}>
          <Star className="w-3 h-3" /> Points
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => openDetail(c)}><Eye className="w-3.5 h-3.5" /></Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => openEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
      </div>
    )},
  ];

  return (
    <div>
      <Header title="Customers" subtitle="CRM and loyalty programme" />
      <div className="p-6 space-y-6">

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-blue-100 rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{(customers ?? []).length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total Customers</p>
            </div>
          </div>
          <div className="bg-white border border-amber-100 rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
              <Star className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalPoints.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total Points Issued</p>
            </div>
          </div>
          <div className="bg-white border border-emerald-100 rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalSpent.toFixed(0)}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total Revenue</p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <Input placeholder="Search by name, email or phone..." value={search} onChange={e => setSearch(e.target.value)} className="w-72 h-9" />
            <Button className="gap-2 h-9" onClick={openAdd}><Plus className="w-4 h-4" /> Add Customer</Button>
          </div>
          <div className="p-4">
            {customers === null ? <TableSkeleton rows={7} cols={6} /> : (
              <DataTable data={customers} columns={columns} searchKeys={["name","email","phone"]} searchPlaceholder="Search..." pageSize={25} emptyMessage="No customers yet." />
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit */}
      <Dialog open={dialog==="add"||dialog==="edit"} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{dialog==="edit"?"Edit Customer":"Add Customer"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Name</label>
              <Input placeholder="Full name" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Email</label>
                <Input type="email" placeholder="email@example.com" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Phone</label>
                <Input placeholder="+60..." value={form.phone} onChange={e => setForm(f=>({...f,phone:e.target.value}))} /></div>
            </div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Preferred Language</label>
              <Select value={form.preferred_language} onValueChange={v => v && setForm(f=>({...f,preferred_language:v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LANGUAGES.map(l => <SelectItem key={l} value={l}>{LANG_LABEL[l]}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Notes</label>
              <Input placeholder="Any notes..." value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving||!form.name}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}{dialog==="edit"?"Save Changes":"Add Customer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Points */}
      <Dialog open={dialog==="points"} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Loyalty Points — {selected?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-400 flex items-center justify-center">
                <Award className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-amber-800">{selected?.loyalty_points}</p>
                <p className="text-xs text-amber-600">current points</p>
              </div>
            </div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Action</label>
              <Select value={pointsForm.action} onValueChange={v => v && setPointsForm(f=>({...f,action:v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="add_points"><span className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-emerald-500" />Add Points</span></SelectItem>
                  <SelectItem value="deduct_points"><span className="flex items-center gap-1.5"><TrendingDown className="w-3.5 h-3.5 text-red-500" />Deduct Points</span></SelectItem>
                </SelectContent>
              </Select></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Points</label>
              <Input type="number" min="1" value={pointsForm.points} onChange={e => setPointsForm(f=>({...f,points:e.target.value}))} /></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Notes (optional)</label>
              <Input placeholder="Reason..." value={pointsForm.notes} onChange={e => setPointsForm(f=>({...f,notes:e.target.value}))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={adjustPoints} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail */}
      <Dialog open={dialog==="detail"} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-sm font-bold text-white">{detail?.name.charAt(0).toUpperCase()}</span>
              </div>
              <DialogTitle>{detail?.name}</DialogTitle>
            </div>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gradient-to-b from-amber-50 to-amber-100/50 border border-amber-200 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-amber-700">{detail.loyalty_points}</p>
                  <p className="text-[10px] text-amber-500 mt-0.5 font-medium">Points</p>
                </div>
                <div className="bg-gradient-to-b from-blue-50 to-blue-100/50 border border-blue-200 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-blue-700">{parseFloat(String(detail.total_spent)).toFixed(0)}</p>
                  <p className="text-[10px] text-blue-500 mt-0.5 font-medium">Spent</p>
                </div>
                <div className="bg-gradient-to-b from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-emerald-700">{detail.visit_count}</p>
                  <p className="text-[10px] text-emerald-500 mt-0.5 font-medium">Visits</p>
                </div>
              </div>
              {(detail.email || detail.phone) && (
                <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1">
                  {detail.email && <p className="text-xs text-gray-600">{detail.email}</p>}
                  {detail.phone && <p className="text-xs text-gray-600">{detail.phone}</p>}
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Points Activity</p>
                <div className="space-y-1.5 max-h-52 overflow-y-auto">
                  {(!detail.transactions||detail.transactions.length===0) ? (
                    <p className="text-sm text-gray-400 text-center py-6">No transactions yet.</p>
                  ) : detail.transactions.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-3 py-2.5">
                      <div>
                        <span className={"text-[10px] font-bold px-2 py-0.5 rounded-full uppercase " + (TX_COLOR[tx.type]??"bg-gray-100 text-gray-500")}>{tx.type.replace("_"," ")}</span>
                        {tx.notes && <p className="text-xs text-gray-500 mt-0.5">{tx.notes}</p>}
                        <p className="text-[10px] text-gray-400 mt-0.5">{new Date(tx.created_at).toLocaleString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</p>
                      </div>
                      <div className="text-right">
                        <p className={"text-sm font-bold " + (tx.points>=0?"text-emerald-600":"text-red-500")}>{tx.points>=0?"+":""}{tx.points}</p>
                        <p className="text-[10px] text-gray-400">{tx.balance_after} bal</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
