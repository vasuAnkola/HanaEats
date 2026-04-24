"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Loader2, Plus, Trash2, Pencil, Megaphone, CalendarDays, Zap } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Promotion {
  id: number; name: string; discount_type: string; discount_value: number;
  start_date: string; end_date: string; festival_tag: string | null;
  applies_to: string; is_active: boolean;
}

const FESTIVAL_TAGS = ["lunar_new_year","hari_raya","songkran","diwali","other"];
const FESTIVAL_LABEL: Record<string,string> = { lunar_new_year:"Lunar New Year", hari_raya:"Hari Raya", songkran:"Songkran", diwali:"Diwali", other:"Other" };
const FESTIVAL_COLOR: Record<string,string> = {
  lunar_new_year: "bg-red-50 text-red-700 ring-1 ring-red-200",
  hari_raya: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  songkran: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  diwali: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  other: "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
};

const empty = { name:"", discount_type:"percentage", discount_value:"10", start_date:"", end_date:"", festival_tag:"", applies_to:"all" };

function isActive(p: Promotion) {
  if (!p.is_active) return false;
  const today = new Date().toISOString().split("T")[0];
  return p.start_date <= today && today <= p.end_date;
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[] | null>(null);
  const [dialog, setDialog] = useState<"add"|"edit"|null>(null);
  const [selected, setSelected] = useState<Promotion | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(empty);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const load = () => fetch("/api/promotions").then(r=>r.json()).then(d=>setPromotions(Array.isArray(d)?d:[]));
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(empty); setError(""); setDialog("add"); }
  function openEdit(p: Promotion) {
    setSelected(p);
    setForm({ name:p.name, discount_type:p.discount_type, discount_value:String(p.discount_value), start_date:p.start_date, end_date:p.end_date, festival_tag:p.festival_tag??"", applies_to:p.applies_to });
    setError(""); setDialog("edit");
  }

  async function save() {
    setSaving(true); setError("");
    const url = dialog==="edit" ? "/api/promotions/"+selected!.id : "/api/promotions";
    const res = await fetch(url, {
      method: dialog==="edit"?"PATCH":"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ name:form.name, discount_type:form.discount_type, discount_value:parseFloat(form.discount_value)||0, start_date:form.start_date, end_date:form.end_date, festival_tag:form.festival_tag||null, applies_to:form.applies_to }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error??"Failed"); setSaving(false); return; }
    setDialog(null); setSaving(false); load();
  }

  async function toggle(p: Promotion) {
    setTogglingId(p.id);
    await fetch("/api/promotions/"+p.id, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ is_active:!p.is_active }) });
    setTogglingId(null);
    load();
  }

  async function confirmDel() {
    if (confirmId === null) return;
    await fetch("/api/promotions/" + confirmId, { method: "DELETE" });
    setConfirmId(null);
    load();
  }

  const activeCount = (promotions ?? []).filter(isActive).length;
  const upcomingCount = (promotions ?? []).filter(p => p.is_active && p.start_date > new Date().toISOString().split("T")[0]).length;

  const columns: Column<Promotion>[] = [
    { key:"name", label:"Promotion", sortable:true, render: p => (
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
          <Megaphone className="w-4 h-4 text-blue-500" />
        </div>
        <div>
          <p className="font-medium text-gray-900 text-sm">{p.name}</p>
          {p.festival_tag && (
            <span className={`mt-0.5 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${FESTIVAL_COLOR[p.festival_tag]??"bg-purple-50 text-purple-700 ring-1 ring-purple-200"}`}>
              {FESTIVAL_LABEL[p.festival_tag]??p.festival_tag}
            </span>
          )}
        </div>
      </div>
    )},
    { key:"discount_type", label:"Discount", render: p => (
      <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1">
        <Zap className="w-3 h-3 text-blue-500" />
        <span className="text-sm font-bold text-blue-700">
          {p.discount_type==="percentage" ? parseFloat(String(p.discount_value)).toFixed(0)+"%" : parseFloat(String(p.discount_value)).toFixed(2)+" off"}
        </span>
      </div>
    )},
    { key:"start_date", label:"Period", render: p => (
      <div className="flex items-center gap-1.5">
        <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs text-gray-600">
          {new Date(p.start_date).toLocaleDateString("en-GB",{day:"2-digit",month:"short"})} — {new Date(p.end_date).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}
        </span>
      </div>
    )},
    { key:"applies_to", label:"Applies To", render: p => (
      <span className="text-xs text-gray-500 capitalize">{p.applies_to.replace("_"," ")}</span>
    )},
    { key:"is_active", label:"Status", render: p => (
      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
        isActive(p) ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
        : p.is_active && p.start_date > new Date().toISOString().split("T")[0] ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
        : "bg-gray-100 text-gray-500 ring-1 ring-gray-200"
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${isActive(p) ? "bg-emerald-500" : p.is_active && p.start_date > new Date().toISOString().split("T")[0] ? "bg-blue-500" : "bg-gray-400"}`} />
        {isActive(p) ? "Active" : p.is_active && p.start_date > new Date().toISOString().split("T")[0] ? "Upcoming" : "Inactive"}
      </span>
    )},
    { key:"actions", label:"", render: p => (
      <div className="flex items-center gap-2">
        <button
          onClick={() => toggle(p)}
          disabled={togglingId === p.id}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${p.is_active ? "bg-emerald-500" : "bg-gray-300"}`}
        >
          <span className={`inline-block w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${p.is_active ? "translate-x-4" : "translate-x-0.5"}`}>
            {togglingId === p.id && <Loader2 className="w-2.5 h-2.5 animate-spin text-gray-400 m-auto mt-0.5" />}
          </span>
        </button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => openEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50" onClick={() => setConfirmId(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
      </div>
    )},
  ];

  return (
    <div>
      <ConfirmDialog open={confirmId !== null} description="Delete this promotion? This cannot be undone." onConfirm={confirmDel} onCancel={() => setConfirmId(null)} />
      <Header title="Promotions" subtitle="Seasonal and festival promotions" />
      <div className="p-6 space-y-6">

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-blue-100 rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Megaphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{(promotions ?? []).length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total Promotions</p>
            </div>
          </div>
          <div className="bg-white border border-emerald-100 rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">Currently Active</p>
            </div>
          </div>
          <div className="bg-white border border-blue-100 rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-400 flex items-center justify-center flex-shrink-0">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{upcomingCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">Upcoming</p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700">All Promotions</p>
            <Button className="gap-2 h-9" onClick={openAdd}><Plus className="w-4 h-4" /> New Promotion</Button>
          </div>
          <div className="p-4">
            {promotions === null ? <TableSkeleton rows={5} cols={5} /> : (
              <DataTable data={promotions} columns={columns} searchKeys={["name","festival_tag"]} searchPlaceholder="Search promotions..." pageSize={25} emptyMessage="No promotions yet." />
            )}
          </div>
        </div>
      </div>

      <Dialog open={dialog==="add"||dialog==="edit"} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{dialog==="edit"?"Edit Promotion":"New Promotion"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Name</label>
              <Input placeholder="e.g. Raya Special 15% Off" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Discount Type</label>
                <Select value={form.discount_type} onValueChange={v => v && setForm(f=>({...f,discount_type:v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage %</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Value</label>
                <Input type="number" min="0" step="0.01" value={form.discount_value} onChange={e => setForm(f=>({...f,discount_value:e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Start Date</label>
                <Input type="date" value={form.start_date} onChange={e => setForm(f=>({...f,start_date:e.target.value}))} /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">End Date</label>
                <Input type="date" value={form.end_date} onChange={e => setForm(f=>({...f,end_date:e.target.value}))} /></div>
            </div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Festival Tag (optional)</label>
              <Select value={form.festival_tag||"none"} onValueChange={v => setForm(f=>({...f,festival_tag:v==="none" ? "" : (v ?? "")}))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {FESTIVAL_TAGS.map(t => <SelectItem key={t} value={t}>{FESTIVAL_LABEL[t]}</SelectItem>)}
                </SelectContent>
              </Select></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Applies To</label>
              <Select value={form.applies_to} onValueChange={v => v && setForm(f=>({...f,applies_to:v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="item">Specific Item</SelectItem>
                </SelectContent>
              </Select></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving||!form.name||!form.start_date||!form.end_date}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}{dialog==="edit"?"Save Changes":"Create Promotion"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
