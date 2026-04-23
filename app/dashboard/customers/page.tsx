"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Loader2, Plus, Eye, Pencil, Star, TrendingUp, TrendingDown } from "lucide-react";

interface Customer {
  id: number; name: string; email: string | null; phone: string | null;
  loyalty_points: number; total_spent: number; visit_count: number;
  preferred_language: string; notes: string | null;
}
interface LoyaltyTx { id: number; type: string; points: number; balance_after: number; notes: string | null; created_at: string; }
interface CustomerDetail extends Customer { transactions: LoyaltyTx[]; }

const LANGUAGES = ["en","th","ms","id","vi"];
const LANG_LABEL: Record<string,string> = { en:"English", th:"Thai", ms:"Bahasa Malaysia", id:"Bahasa Indonesia", vi:"Vietnamese" };
const TX_COLOR: Record<string,string> = { earn:"bg-emerald-100 text-emerald-700", redeem:"bg-amber-100 text-amber-700", manual_add:"bg-blue-100 text-blue-700", manual_deduct:"bg-red-100 text-red-600", expire:"bg-gray-100 text-gray-500" };

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

  const load = useCallback(async () => {
    const url = "/api/customers" + (search ? "?search=" + encodeURIComponent(search) : "");
    const res = await fetch(url);
    setCustomers(Array.isArray(await res.json()) ? await (await fetch(url)).json() : []);
  }, [search]);

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

  const columns: Column<Customer>[] = [
    { key:"name", label:"Customer", sortable:true, render: c => (
      <div><p className="font-medium text-gray-900 text-sm">{c.name}</p>
      {c.email && <p className="text-[11px] text-gray-400 mt-0.5">{c.email}</p>}</div>
    )},
    { key:"phone", label:"Phone", render: c => <span className="text-sm text-gray-600">{c.phone??"—"}</span> },
    { key:"loyalty_points", label:"Points", sortable:true, render: c => (
      <div className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /><span className="font-semibold text-gray-900">{c.loyalty_points}</span></div>
    )},
    { key:"total_spent", label:"Total Spent", sortable:true, render: c => <span className="text-sm font-medium text-gray-700">{parseFloat(String(c.total_spent)).toFixed(2)}</span> },
    { key:"visit_count", label:"Visits", render: c => <span className="text-sm text-gray-500">{c.visit_count}</span> },
    { key:"actions", label:"", render: c => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-amber-500" onClick={() => openPoints(c)}><Star className="w-3.5 h-3.5" /></Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-indigo-600" onClick={() => openDetail(c)}><Eye className="w-3.5 h-3.5" /></Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-indigo-600" onClick={() => openEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
      </div>
    )},
  ];

  return (
    <div>
      <Header title="Customers" subtitle="CRM and loyalty programme" />
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Input placeholder="Search by name, email or phone..." value={search} onChange={e => setSearch(e.target.value)} className="w-72" />
          <div className="ml-auto">
            <Button className="gap-2" onClick={openAdd}><Plus className="w-4 h-4" /> Add Customer</Button>
          </div>
        </div>
        {customers === null ? <TableSkeleton rows={7} cols={6} /> : (
          <DataTable data={customers} columns={columns} searchKeys={["name","email","phone"]} searchPlaceholder="Search..." pageSize={25} emptyMessage="No customers yet." />
        )}
      </div>

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

      <Dialog open={dialog==="points"} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Loyalty Points — {selected?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-400" /><span className="text-sm font-semibold text-amber-800">{selected?.loyalty_points} current points</span>
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

      <Dialog open={dialog==="detail"} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{detail?.name}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-amber-700">{detail.loyalty_points}</p>
                  <p className="text-[10px] text-amber-500 mt-0.5">Points</p>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-indigo-700">{parseFloat(String(detail.total_spent)).toFixed(0)}</p>
                  <p className="text-[10px] text-indigo-500 mt-0.5">Total Spent</p>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-gray-700">{detail.visit_count}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Visits</p>
                </div>
              </div>
              <div className="text-xs text-gray-500 space-y-0.5">
                {detail.email && <p>{detail.email}</p>}
                {detail.phone && <p>{detail.phone}</p>}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Recent Points Activity</p>
                <div className="space-y-1.5 max-h-52 overflow-y-auto">
                  {(!detail.transactions||detail.transactions.length===0) ? (
                    <p className="text-sm text-gray-400 text-center py-4">No transactions yet.</p>
                  ) : detail.transactions.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <div>
                        <span className={"text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase " + (TX_COLOR[tx.type]??"bg-gray-100 text-gray-500")}>{tx.type.replace("_"," ")}</span>
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