"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Loader2, Plus, Trash2, Pencil } from "lucide-react";

interface Promotion {
  id: number; name: string; discount_type: string; discount_value: number;
  start_date: string; end_date: string; festival_tag: string | null;
  applies_to: string; is_active: boolean;
}

const FESTIVAL_TAGS = ["lunar_new_year","hari_raya","songkran","diwali","other"];
const FESTIVAL_LABEL: Record<string,string> = { lunar_new_year:"Lunar New Year", hari_raya:"Hari Raya", songkran:"Songkran", diwali:"Diwali", other:"Other" };
const FESTIVAL_COLOR: Record<string,string> = { lunar_new_year:"bg-red-100 text-red-700", hari_raya:"bg-emerald-100 text-emerald-700", songkran:"bg-blue-100 text-blue-700", diwali:"bg-amber-100 text-amber-700", other:"bg-purple-100 text-purple-700" };

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
    await fetch("/api/promotions/"+p.id, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ is_active:!p.is_active }) });
    load();
  }

  async function del(id: number) {
    if (!confirm("Delete this promotion?")) return;
    await fetch("/api/promotions/"+id, { method:"DELETE" }); load();
  }

  const columns: Column<Promotion>[] = [
    { key:"name", label:"Promotion", sortable:true, render: p => (
      <div>
        <p className="font-medium text-gray-900 text-sm">{p.name}</p>
        {p.festival_tag && <span className={"mt-0.5 inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase " + (FESTIVAL_COLOR[p.festival_tag]??"bg-purple-100 text-purple-700")}>{FESTIVAL_LABEL[p.festival_tag]??p.festival_tag}</span>}
      </div>
    )},
    { key:"discount_type", label:"Discount", render: p => (
      <span className="text-sm font-semibold text-indigo-700">{p.discount_type==="percentage"?parseFloat(String(p.discount_value)).toFixed(0)+"%":parseFloat(String(p.discount_value)).toFixed(2)+" off"}</span>
    )},
    { key:"start_date", label:"Period", render: p => (
      <span className="text-xs text-gray-500">{new Date(p.start_date).toLocaleDateString("en-GB",{day:"2-digit",month:"short"})} — {new Date(p.end_date).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</span>
    )},
    { key:"is_active", label:"Status", render: p => (
      <span className={"text-[10px] font-bold px-2 py-0.5 rounded-full uppercase " + (isActive(p)?"bg-emerald-100 text-emerald-700":"bg-gray-100 text-gray-500")}>
        {isActive(p)?"Active":"Inactive"}
      </span>
    )},
    { key:"actions", label:"", render: p => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-indigo-600" onClick={() => openEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-gray-400 hover:text-indigo-600" onClick={() => toggle(p)}>{p.is_active?"Disable":"Enable"}</Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-red-500" onClick={() => del(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
      </div>
    )},
  ];

  const FormDialog = (
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
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={save} disabled={saving||!form.name||!form.start_date||!form.end_date}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}{dialog==="edit"?"Save Changes":"Create Promotion"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div>
      <Header title="Promotions" subtitle="Seasonal and festival promotions" />
      <div className="p-6">
        <div className="flex justify-end mb-6">
          <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={openAdd}><Plus className="w-4 h-4" /> New Promotion</Button>
        </div>
        {promotions === null ? <TableSkeleton rows={5} cols={5} /> : (
          <DataTable data={promotions} columns={columns} searchKeys={["name","festival_tag"]} searchPlaceholder="Search promotions..." pageSize={25} emptyMessage="No promotions yet." />
        )}
      </div>
      {FormDialog}
    </div>
  );
}