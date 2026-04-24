"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Loader2, Plus, Trash2, Tag, CheckCircle, Clock, Percent } from "lucide-react";
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
  const [togglingId, setTogglingId] = useState<number | null>(null);

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
    setTogglingId(v.id);
    await fetch("/api/vouchers/" + v.id, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ is_active: !v.is_active }) });
    setTogglingId(null);
    load();
  }

  async function confirmDel() {
    if (confirmId === null) return;
    await fetch("/api/vouchers/" + confirmId, { method: "DELETE" });
    setConfirmId(null);
    load();
  }

  const activeCount = (vouchers ?? []).filter(v => v.is_active && !isExpired(v)).length;
  const expiredCount = (vouchers ?? []).filter(v => isExpired(v)).length;

  const columns: Column<Voucher>[] = [
    { key:"code", label:"Voucher", sortable:true, render: v => (
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
          <Tag className="w-4 h-4 text-blue-500" />
        </div>
        <div>
          <p className="font-mono font-bold text-gray-900 text-sm tracking-widest">{v.code}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{v.name}</p>
        </div>
      </div>
    )},
    { key:"discount_type", label:"Discount", render: v => (
      <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1">
        <Percent className="w-3 h-3 text-blue-500" />
        <span className="text-sm font-bold text-blue-700">
          {v.discount_type==="percentage" ? parseFloat(String(v.discount_value)).toFixed(0)+"%" : parseFloat(String(v.discount_value)).toFixed(2)+" off"}
        </span>
      </div>
    )},
    { key:"min_order_amount", label:"Min Order", render: v => (
      <span className="text-sm text-gray-500">{parseFloat(String(v.min_order_amount))>0?parseFloat(String(v.min_order_amount)).toFixed(2):"—"}</span>
    )},
    { key:"used_count", label:"Usage", render: v => (
      <div>
        <p className="text-sm font-semibold text-gray-800">{v.used_count}<span className="text-gray-400 font-normal"> / {v.max_uses ?? "∞"}</span></p>
        {v.max_uses && (
          <div className="w-20 h-1 bg-gray-100 rounded-full mt-1">
            <div className="h-1 bg-blue-400 rounded-full" style={{ width: `${Math.min(100, (v.used_count / v.max_uses) * 100)}%` }} />
          </div>
        )}
      </div>
    )},
    { key:"valid_until", label:"Expires", render: v => (
      <div className="flex items-center gap-1.5">
        <Clock className={`w-3.5 h-3.5 ${isExpired(v) ? "text-red-400" : "text-gray-400"}`} />
        <span className={"text-xs " + (isExpired(v)?"text-red-500 font-semibold":"text-gray-500")}>
          {v.valid_until ? new Date(v.valid_until).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : "No expiry"}
        </span>
      </div>
    )},
    { key:"is_active", label:"Status", render: v => (
      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
        v.is_active && !isExpired(v)
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          : "bg-gray-100 text-gray-500 ring-1 ring-gray-200"
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${v.is_active && !isExpired(v) ? "bg-emerald-500" : "bg-gray-400"}`} />
        {v.is_active && !isExpired(v) ? "Active" : isExpired(v) ? "Expired" : "Inactive"}
      </span>
    )},
    { key:"actions", label:"", render: v => (
      <div className="flex items-center gap-2">
        <button
          onClick={() => toggle(v)}
          disabled={togglingId === v.id}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${v.is_active ? "bg-emerald-500" : "bg-gray-300"}`}
        >
          <span className={`inline-block w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${v.is_active ? "translate-x-4" : "translate-x-0.5"}`}>
            {togglingId === v.id && <Loader2 className="w-2.5 h-2.5 animate-spin text-gray-400 m-auto mt-0.5" />}
          </span>
        </button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50" onClick={() => setConfirmId(v.id)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    )},
  ];

  return (
    <div>
      <ConfirmDialog open={confirmId !== null} description="Delete this voucher? This cannot be undone." onConfirm={confirmDel} onCancel={() => setConfirmId(null)} />
      <Header title="Vouchers" subtitle="Discount codes and coupons" />
      <div className="p-6 space-y-6">

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-blue-100 rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{(vouchers ?? []).length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total Vouchers</p>
            </div>
          </div>
          <div className="bg-white border border-emerald-100 rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">Active</p>
            </div>
          </div>
          <div className="bg-white border border-red-100 rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-red-400 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{expiredCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">Expired</p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700">All Vouchers</p>
            <Button className="gap-2 h-9" onClick={() => { setForm(empty); setError(""); setDialog(true); }}>
              <Plus className="w-4 h-4" /> Add Voucher
            </Button>
          </div>
          <div className="p-4">
            {vouchers === null ? <TableSkeleton rows={6} cols={7} /> : (
              <DataTable data={vouchers} columns={columns} searchKeys={["code","name"]} searchPlaceholder="Search vouchers..." pageSize={25} emptyMessage="No vouchers yet." />
            )}
          </div>
        </div>
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
