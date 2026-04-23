"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Loader2, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Voucher {
  id: number; code: string; name: string; discount_type: string;
  discount_value: number; min_order_amount: number; max_uses: number | null;
  used_count: number; valid_from: string | null; valid_until: string | null; is_active: boolean;
}

const empty = { code:"", name:"", discount_type:"percentage", discount_value:"10", min_order_amount:"0", max_uses:"", valid_from:"", valid_until:"" };

function isExpired(v: Voucher) {
  if (!v.valid_until) return false;
  return new Date(v.valid_until) < new Date();
}

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[] | null>(null);
  const [dialog, setDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(empty);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const load = () => fetch("/api/vouchers").then(r=>r.json()).then(d=>setVouchers(Array.isArray(d)?d:[]));
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true); setError("");
    const res = await fetch("/api/vouchers", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ code:form.code.toUpperCase(), name:form.name, discount_type:form.discount_type, discount_value:parseFloat(form.discount_value)||0, min_order_amount:parseFloat(form.min_order_amount)||0, max_uses:form.max_uses?parseInt(form.max_uses):null, valid_from:form.valid_from||null, valid_until:form.valid_until||null }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error??"Failed"); setSaving(false); return; }
    setDialog(false); setSaving(false); setForm(empty); load();
  }

  async function toggle(v: Voucher) {
    await fetch("/api/vouchers/" + v.id, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ is_active: !v.is_active }) });
    load();
  }

  async function del(id: number) {
    setConfirmId(id);
  }

  async function confirmDel() {
    if (confirmId === null) return;
    await fetch("/api/vouchers/" + confirmId, { method: "DELETE" });
    setConfirmId(null);
    load();
  }

  const columns: Column<Voucher>[] = [
    { key:"code", label:"Code", sortable:true, render: v => (
      <div><p className="font-mono font-bold text-gray-900 text-sm tracking-widest">{v.code}</p>
      <p className="text-[11px] text-gray-400 mt-0.5">{v.name}</p></div>
    )},
    { key:"discount_type", label:"Discount", render: v => (
      <span className="text-sm font-semibold text-indigo-700">
        {v.discount_type==="percentage" ? parseFloat(String(v.discount_value)).toFixed(0)+"%" : parseFloat(String(v.discount_value)).toFixed(2)+" off"}
      </span>
    )},
    { key:"min_order_amount", label:"Min Order", render: v => <span className="text-sm text-gray-500">{parseFloat(String(v.min_order_amount))>0?parseFloat(String(v.min_order_amount)).toFixed(2):"—"}</span> },
    { key:"used_count", label:"Used", render: v => (
      <span className="text-sm text-gray-600">{v.used_count}{v.max_uses?" / "+v.max_uses:" / ∞"}</span>
    )},
    { key:"valid_until", label:"Expires", render: v => (
      <span className={"text-xs " + (isExpired(v)?"text-red-500 font-medium":"text-gray-500")}>
        {v.valid_until ? new Date(v.valid_until).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : "No expiry"}
      </span>
    )},
    { key:"is_active", label:"Status", render: v => (
      <span className={"text-[10px] font-bold px-2 py-0.5 rounded-full uppercase " + (v.is_active&&!isExpired(v)?"bg-emerald-100 text-emerald-700":"bg-gray-100 text-gray-500")}>
        {v.is_active&&!isExpired(v)?"Active":"Inactive"}
      </span>
    )},
    { key:"actions", label:"", render: v => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-indigo-600" onClick={() => toggle(v)}>
          {v.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-red-500" onClick={() => del(v.id)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    )},
  ];

  return (
    <div>
      <ConfirmDialog open={confirmId !== null} description="Delete this voucher? This cannot be undone." onConfirm={confirmDel} onCancel={() => setConfirmId(null)} />
      <Header title="Vouchers" subtitle="Discount codes and coupons" />
      <div className="p-6">
        <div className="flex justify-end mb-6">
          <Button className="gap-2" onClick={() => { setForm(empty); setError(""); setDialog(true); }}>
            <Plus className="w-4 h-4" /> Add Voucher
          </Button>
        </div>
        {vouchers === null ? <TableSkeleton rows={6} cols={7} /> : (
          <DataTable data={vouchers} columns={columns} searchKeys={["code","name"]} searchPlaceholder="Search vouchers..." pageSize={25} emptyMessage="No vouchers yet." />
        )}
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>New Voucher</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Code</label>
                <Input placeholder="SAVE10" className="font-mono uppercase" value={form.code} onChange={e => setForm(f=>({...f,code:e.target.value.toUpperCase()}))} /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Name</label>
                <Input placeholder="10% Off" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Type</label>
                <Select value={form.discount_type} onValueChange={v => v && setForm(f=>({...f,discount_type:v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage %</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Value</label>
                <Input type="number" min="0" step="0.01" placeholder={form.discount_type==="percentage"?"10":"5.00"} value={form.discount_value} onChange={e => setForm(f=>({...f,discount_value:e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Min Order</label>
                <Input type="number" min="0" step="0.01" placeholder="0" value={form.min_order_amount} onChange={e => setForm(f=>({...f,min_order_amount:e.target.value}))} /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Max Uses</label>
                <Input type="number" min="1" placeholder="Unlimited" value={form.max_uses} onChange={e => setForm(f=>({...f,max_uses:e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Valid From</label>
                <Input type="date" value={form.valid_from} onChange={e => setForm(f=>({...f,valid_from:e.target.value}))} /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Valid Until</label>
                <Input type="date" value={form.valid_until} onChange={e => setForm(f=>({...f,valid_until:e.target.value}))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving||!form.code||!form.name}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}Create Voucher</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}