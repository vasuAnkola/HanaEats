const fs = require("fs");
const path = require("path");
const base = "d:/WORK24/hana eats/app";
function w(rel, content) {
  const fp = path.join(base, rel);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, content, "utf8");
  console.log("Written:", rel);
}

// ============================================================
// app/dashboard/customers/page.tsx
// ============================================================
w("app/dashboard/customers/page.tsx", `"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Loader2, Eye, Pencil, Plus, Minus } from "lucide-react";

interface Customer {
  id: number; name: string; email: string | null; phone: string | null;
  preferred_language: string; loyalty_points: number; total_spent: string;
  visit_count: number; notes: string | null; is_active: boolean; created_at: string;
}
interface LoyaltyTx {
  id: number; type: string; points: number; balance_after: number; notes: string | null; created_at: string;
}
interface CustomerDetail extends Customer { transactions: LoyaltyTx[]; }

const LANG_LABELS: Record<string, string> = { en: "English", th: "Thai", ms: "Malay", id: "Indonesian", vi: "Vietnamese" };
const TX_TYPE_COLORS: Record<string, string> = {
  earn: "bg-emerald-100 text-emerald-700",
  redeem: "bg-red-100 text-red-700",
  manual_add: "bg-blue-100 text-blue-700",
  manual_deduct: "bg-orange-100 text-orange-700",
  expire: "bg-gray-100 text-gray-500",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pointsOpen, setPointsOpen] = useState(false);
  const [pointsAction, setPointsAction] = useState<"add_points"|"deduct_points">("add_points");
  const [selected, setSelected] = useState<CustomerDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Add form
  const [fName, setFName] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [fLang, setFLang] = useState("en");
  const [fNotes, setFNotes] = useState("");

  // Points form
  const [pPoints, setPPoints] = useState("0");
  const [pNotes, setPNotes] = useState("");

  const load = useCallback(async () => {
    const qs = search ? "?search=" + encodeURIComponent(search) : "";
    const res = await fetch("/api/customers" + qs);
    const data = await res.json();
    setCustomers(Array.isArray(data) ? data : []);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  async function addCustomer() {
    setSaving(true); setError("");
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: fName, email: fEmail || null, phone: fPhone || null, preferred_language: fLang, notes: fNotes || null }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed"); setSaving(false); return; }
    setAddOpen(false); setSaving(false);
    setFName(""); setFEmail(""); setFPhone(""); setFLang("en"); setFNotes("");
    await load();
  }

  async function openDetail(c: Customer) {
    const res = await fetch("/api/customers/" + c.id);
    const data = await res.json();
    setSelected(data);
    setDetailOpen(true);
  }

  async function openEdit(c: Customer) {
    setSelected(c as CustomerDetail);
    setFName(c.name); setFEmail(c.email ?? ""); setFPhone(c.phone ?? ""); setFNotes(c.notes ?? "");
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!selected) return;
    setSaving(true); setError("");
    const res = await fetch("/api/customers/" + selected.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: fName, email: fEmail || null, phone: fPhone || null, notes: fNotes || null }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed"); setSaving(false); return; }
    setEditOpen(false); setSaving(false); await load();
  }

  async function adjustPoints() {
    if (!selected) return;
    setSaving(true); setError("");
    const res = await fetch("/api/customers/" + selected.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: pointsAction, points: parseInt(pPoints) || 0, notes: pNotes || null }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed"); setSaving(false); return; }
    setPointsOpen(false); setSaving(false);
    setPPoints("0"); setPNotes("");
    const refreshRes = await fetch("/api/customers/" + selected.id);
    setSelected(await refreshRes.json());
    await load();
  }

  const columns: Column<Customer>[] = [
    {
      key: "name", label: "Customer", sortable: true,
      render: c => (
        <div>
          <p className="text-sm font-medium text-gray-900">{c.name}</p>
          {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
        </div>
      ),
    },
    { key: "phone", label: "Phone", render: c => <span className="text-sm text-gray-600">{c.phone ?? "—"}</span> },
    {
      key: "loyalty_points", label: "Points", sortable: true,
      render: c => (
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
          {parseInt(String(c.loyalty_points))} pts
        </span>
      ),
    },
    {
      key: "total_spent", label: "Total Spent", sortable: true,
      render: c => <span className="text-sm text-gray-700">{parseFloat(String(c.total_spent)).toFixed(2)}</span>,
    },
    { key: "visit_count", label: "Visits", render: c => <span className="text-sm text-gray-600">{parseInt(String(c.visit_count))}</span> },
    {
      key: "actions", label: "",
      render: c => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-indigo-600" onClick={() => openDetail(c)}><Eye className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-indigo-600" onClick={() => openEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Header title="Customers" subtitle="CRM and loyalty programme" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
          <Input
            placeholder="Search by name, email or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-72 h-9"
          />
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white h-9" onClick={() => { setError(""); setAddOpen(true); }}>
            Add Customer
          </Button>
        </div>

        {customers === null ? (
          <TableSkeleton rows={6} cols={6} />
        ) : (
          <DataTable data={customers} columns={columns} searchKeys={["name","email","phone"]} searchPlaceholder="Filter..." pageSize={20} emptyMessage="No customers yet." />
        )}
      </div>

      {/* Add Customer Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Customer</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div>
              <label className="text-xs font-medium text-gray-600">Name *</label>
              <Input className="mt-1" value={fName} onChange={e => setFName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Email</label>
                <Input className="mt-1" type="email" value={fEmail} onChange={e => setFEmail(e.target.value)} placeholder="optional" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Phone</label>
                <Input className="mt-1" value={fPhone} onChange={e => setFPhone(e.target.value)} placeholder="optional" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Preferred Language</label>
              <Select value={fLang} onValueChange={v => v && setFLang(v)}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LANG_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Notes</label>
              <Input className="mt-1" value={fNotes} onChange={e => setFNotes(e.target.value)} placeholder="optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={addCustomer} disabled={saving || !fName}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Add Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{selected?.name}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-indigo-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-indigo-700">{parseInt(String(selected.loyalty_points))}</p>
                  <p className="text-xs text-indigo-500 mt-0.5">Points</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{parseFloat(String(selected.total_spent)).toFixed(0)}</p>
                  <p className="text-xs text-emerald-500 mt-0.5">Total Spent</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-gray-700">{parseInt(String(selected.visit_count))}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Visits</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs" onClick={() => { setPointsAction("add_points"); setError(""); setPointsOpen(true); }}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Points
                </Button>
                <Button variant="outline" className="flex-1 h-8 text-xs" onClick={() => { setPointsAction("deduct_points"); setError(""); setPointsOpen(true); }}>
                  <Minus className="w-3.5 h-3.5 mr-1" /> Deduct Points
                </Button>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Recent Loyalty Transactions</p>
                {selected.transactions.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No transactions yet</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {selected.transactions.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className={"text-[10px] font-semibold px-1.5 py-0.5 rounded " + (TX_TYPE_COLORS[tx.type] ?? "bg-gray-100 text-gray-600")}>
                            {tx.type.replace("_", " ")}
                          </span>
                          {tx.notes && <span className="text-xs text-gray-500">{tx.notes}</span>}
                        </div>
                        <div className="text-right">
                          <span className={"text-sm font-medium " + (tx.points > 0 ? "text-emerald-600" : "text-red-600")}>
                            {tx.points > 0 ? "+" : ""}{tx.points}
                          </span>
                          <p className="text-[10px] text-gray-400">{new Date(tx.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Customer</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div>
              <label className="text-xs font-medium text-gray-600">Name *</label>
              <Input className="mt-1" value={fName} onChange={e => setFName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Email</label>
                <Input className="mt-1" type="email" value={fEmail} onChange={e => setFEmail(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Phone</label>
                <Input className="mt-1" value={fPhone} onChange={e => setFPhone(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Notes</label>
              <Input className="mt-1" value={fNotes} onChange={e => setFNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={saveEdit} disabled={saving || !fName}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Points Adjust Dialog */}
      <Dialog open={pointsOpen} onOpenChange={setPointsOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{pointsAction === "add_points" ? "Add Points" : "Deduct Points"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div>
              <label className="text-xs font-medium text-gray-600">Points</label>
              <Input className="mt-1" type="number" min="1" value={pPoints} onChange={e => setPPoints(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Notes (optional)</label>
              <Input className="mt-1" value={pNotes} onChange={e => setPNotes(e.target.value)} placeholder="Reason..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPointsOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={adjustPoints} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
`);

// ============================================================
// app/dashboard/vouchers/page.tsx
// ============================================================
w("app/dashboard/vouchers/page.tsx", `"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Loader2, Trash2 } from "lucide-react";

interface Voucher {
  id: number; code: string; name: string; discount_type: string; discount_value: string;
  min_order_amount: string; max_uses: number | null; used_count: number;
  valid_from: string | null; valid_until: string | null; is_active: boolean; created_at: string;
}

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[] | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [fCode, setFCode] = useState("");
  const [fName, setFName] = useState("");
  const [fType, setFType] = useState("percentage");
  const [fValue, setFValue] = useState("");
  const [fMin, setFMin] = useState("0");
  const [fMaxUses, setFMaxUses] = useState("");
  const [fFrom, setFFrom] = useState("");
  const [fUntil, setFUntil] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/vouchers");
    const data = await res.json();
    setVouchers(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addVoucher() {
    setSaving(true); setError("");
    const res = await fetch("/api/vouchers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: fCode, name: fName, discount_type: fType, discount_value: parseFloat(fValue) || 0,
        min_order_amount: parseFloat(fMin) || 0,
        max_uses: fMaxUses ? parseInt(fMaxUses) : null,
        valid_from: fFrom || null, valid_until: fUntil || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed"); setSaving(false); return; }
    setAddOpen(false); setSaving(false);
    setFCode(""); setFName(""); setFType("percentage"); setFValue(""); setFMin("0"); setFMaxUses(""); setFFrom(""); setFUntil("");
    await load();
  }

  async function toggleActive(v: Voucher) {
    await fetch("/api/vouchers/" + v.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !v.is_active }),
    });
    await load();
  }

  async function deleteVoucher(v: Voucher) {
    if (!confirm("Delete voucher " + v.code + "?")) return;
    await fetch("/api/vouchers/" + v.id, { method: "DELETE" });
    await load();
  }

  function statusBadge(v: Voucher) {
    const today = new Date().toISOString().split("T")[0];
    const expired = v.valid_until && today > v.valid_until;
    const exhausted = v.max_uses != null && parseInt(String(v.used_count)) >= parseInt(String(v.max_uses));
    if (!v.is_active || expired || exhausted) {
      return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{expired ? "expired" : exhausted ? "exhausted" : "inactive"}</span>;
    }
    return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">active</span>;
  }

  const columns: Column<Voucher>[] = [
    {
      key: "code", label: "Code",
      render: v => <span className="font-mono text-sm font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">{v.code}</span>,
    },
    { key: "name", label: "Name", render: v => <span className="text-sm text-gray-700">{v.name}</span> },
    {
      key: "discount_value", label: "Discount",
      render: v => <span className="text-sm font-medium text-gray-800">{v.discount_type === "percentage" ? parseFloat(String(v.discount_value)).toFixed(0) + "%" : parseFloat(String(v.discount_value)).toFixed(2) + " off"}</span>,
    },
    {
      key: "min_order_amount", label: "Min Order",
      render: v => <span className="text-sm text-gray-600">{parseFloat(String(v.min_order_amount)) > 0 ? parseFloat(String(v.min_order_amount)).toFixed(2) : "—"}</span>,
    },
    {
      key: "used_count", label: "Used / Max",
      render: v => <span className="text-sm text-gray-600">{parseInt(String(v.used_count))}{v.max_uses != null ? " / " + parseInt(String(v.max_uses)) : " / ∞"}</span>,
    },
    {
      key: "valid_until", label: "Valid Until",
      render: v => <span className="text-xs text-gray-500">{v.valid_until ?? "—"}</span>,
    },
    { key: "is_active", label: "Status", render: v => statusBadge(v) },
    {
      key: "actions", label: "",
      render: v => (
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => toggleActive(v)}>
            {v.is_active ? "Disable" : "Enable"}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={() => deleteVoucher(v)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Header title="Vouchers" subtitle="Discount codes and coupons" />
      <div className="p-6">
        <div className="flex justify-end mb-5">
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white h-9" onClick={() => { setError(""); setAddOpen(true); }}>
            Add Voucher
          </Button>
        </div>

        {vouchers === null ? (
          <TableSkeleton rows={6} cols={7} />
        ) : (
          <DataTable data={vouchers} columns={columns} searchKeys={["code","name"]} searchPlaceholder="Search vouchers..." pageSize={20} emptyMessage="No vouchers yet." />
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Voucher</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Code *</label>
                <Input className="mt-1 uppercase" value={fCode} onChange={e => setFCode(e.target.value.toUpperCase())} placeholder="SUMMER10" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Name *</label>
                <Input className="mt-1" value={fName} onChange={e => setFName(e.target.value)} placeholder="Summer Discount" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Discount Type *</label>
                <Select value={fType} onValueChange={v => v && setFType(v)}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Value *</label>
                <Input className="mt-1" type="number" min="0" step="0.01" value={fValue} onChange={e => setFValue(e.target.value)} placeholder={fType === "percentage" ? "10" : "5.00"} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Min Order Amount</label>
                <Input className="mt-1" type="number" min="0" step="0.01" value={fMin} onChange={e => setFMin(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Max Uses (blank = unlimited)</label>
                <Input className="mt-1" type="number" min="1" value={fMaxUses} onChange={e => setFMaxUses(e.target.value)} placeholder="optional" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Valid From</label>
                <Input className="mt-1" type="date" value={fFrom} onChange={e => setFFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Valid Until</label>
                <Input className="mt-1" type="date" value={fUntil} onChange={e => setFUntil(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={addVoucher} disabled={saving || !fCode || !fName || !fValue}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Add Voucher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
`);

// ============================================================
// app/dashboard/promotions/page.tsx
// ============================================================
w("app/dashboard/promotions/page.tsx", `"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Loader2, Trash2 } from "lucide-react";

interface Promotion {
  id: number; name: string; discount_type: string; discount_value: string;
  start_date: string; end_date: string; festival_tag: string | null;
  applies_to: string; is_active: boolean; created_at: string;
}

const FESTIVAL_COLORS: Record<string, string> = {
  lunar_new_year: "bg-red-100 text-red-700",
  hari_raya: "bg-emerald-100 text-emerald-700",
  songkran: "bg-blue-100 text-blue-700",
  diwali: "bg-amber-100 text-amber-700",
  other: "bg-purple-100 text-purple-700",
};

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[] | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [fName, setFName] = useState("");
  const [fType, setFType] = useState("percentage");
  const [fValue, setFValue] = useState("");
  const [fStart, setFStart] = useState("");
  const [fEnd, setFEnd] = useState("");
  const [fTag, setFTag] = useState("none");
  const [fApplies, setFApplies] = useState("all");

  const load = useCallback(async () => {
    const res = await fetch("/api/promotions");
    const data = await res.json();
    setPromotions(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addPromotion() {
    setSaving(true); setError("");
    const res = await fetch("/api/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fName, discount_type: fType, discount_value: parseFloat(fValue) || 0,
        start_date: fStart, end_date: fEnd,
        festival_tag: fTag === "none" ? null : fTag,
        applies_to: fApplies,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed"); setSaving(false); return; }
    setAddOpen(false); setSaving(false);
    setFName(""); setFType("percentage"); setFValue(""); setFStart(""); setFEnd(""); setFTag("none"); setFApplies("all");
    await load();
  }

  async function toggleActive(p: Promotion) {
    await fetch("/api/promotions/" + p.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !p.is_active }),
    });
    await load();
  }

  async function deletePromotion(p: Promotion) {
    if (!confirm("Delete promotion: " + p.name + "?")) return;
    await fetch("/api/promotions/" + p.id, { method: "DELETE" });
    await load();
  }

  function isCurrentlyActive(p: Promotion) {
    const today = new Date().toISOString().split("T")[0];
    return p.is_active && today >= p.start_date && today <= p.end_date;
  }

  const columns: Column<Promotion>[] = [
    { key: "name", label: "Name", sortable: true, render: p => <span className="text-sm font-medium text-gray-900">{p.name}</span> },
    {
      key: "festival_tag", label: "Festival",
      render: p => p.festival_tag ? (
        <span className={"text-[10px] font-semibold px-2 py-0.5 rounded-full " + (FESTIVAL_COLORS[p.festival_tag] ?? "bg-purple-100 text-purple-700")}>
          {p.festival_tag.replace(/_/g, " ")}
        </span>
      ) : <span className="text-gray-300 text-xs">—</span>,
    },
    {
      key: "discount_value", label: "Discount",
      render: p => <span className="text-sm font-medium text-gray-800">{p.discount_type === "percentage" ? parseFloat(String(p.discount_value)).toFixed(0) + "%" : parseFloat(String(p.discount_value)).toFixed(2) + " off"}</span>,
    },
    {
      key: "start_date", label: "Date Range",
      render: p => <span className="text-xs text-gray-500">{p.start_date} → {p.end_date}</span>,
    },
    {
      key: "is_active", label: "Status",
      render: p => isCurrentlyActive(p)
        ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">active now</span>
        : <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{p.is_active ? "scheduled" : "inactive"}</span>,
    },
    {
      key: "actions", label: "",
      render: p => (
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => toggleActive(p)}>
            {p.is_active ? "Disable" : "Enable"}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={() => deletePromotion(p)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Header title="Promotions" subtitle="Seasonal and festival promotions" />
      <div className="p-6">
        <div className="flex justify-end mb-5">
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white h-9" onClick={() => { setError(""); setAddOpen(true); }}>
            New Promotion
          </Button>
        </div>

        {promotions === null ? (
          <TableSkeleton rows={5} cols={6} />
        ) : (
          <DataTable data={promotions} columns={columns} searchKeys={["name","festival_tag"]} searchPlaceholder="Search promotions..." pageSize={20} emptyMessage="No promotions yet." />
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Promotion</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div>
              <label className="text-xs font-medium text-gray-600">Name *</label>
              <Input className="mt-1" value={fName} onChange={e => setFName(e.target.value)} placeholder="Hari Raya Special" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Discount Type *</label>
                <Select value={fType} onValueChange={v => v && setFType(v)}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Value *</label>
                <Input className="mt-1" type="number" min="0" step="0.01" value={fValue} onChange={e => setFValue(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Start Date *</label>
                <Input className="mt-1" type="date" value={fStart} onChange={e => setFStart(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">End Date *</label>
                <Input className="mt-1" type="date" value={fEnd} onChange={e => setFEnd(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Festival Tag</label>
                <Select value={fTag} onValueChange={v => v && setFTag(v)}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="lunar_new_year">Lunar New Year</SelectItem>
                    <SelectItem value="hari_raya">Hari Raya</SelectItem>
                    <SelectItem value="songkran">Songkran</SelectItem>
                    <SelectItem value="diwali">Diwali</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Applies To</label>
                <Select value={fApplies} onValueChange={v => v && setFApplies(v)}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Items</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="item">Specific Item</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={addPromotion} disabled={saving || !fName || !fValue || !fStart || !fEnd}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Create Promotion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
`);

console.log("UI pages 1-3 written!");
