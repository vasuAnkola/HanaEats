"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Loader2, RefreshCw, Eye, Ban } from "lucide-react";

interface Outlet { id: number; name: string; }
interface Payment {
  id: number; payment_number: string; order_number: string;
  total_amount: number; amount_paid: number; change_given: number;
  discount_amount: number; tax_amount: number; status: string;
  created_by_name: string | null; created_at: string;
  splits: { method: string; amount: number; reference: string | null }[] | null;
  order_type: string; table_number: string | null; customer_name: string | null;
}

const STATUS_COLOR: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700",
  voided:    "bg-red-100 text-red-600",
  refunded:  "bg-amber-100 text-amber-700",
  pending:   "bg-gray-100 text-gray-600",
};

const METHOD_LABEL: Record<string, string> = {
  cash: "Cash", card: "Card", grabpay: "GrabPay", gcash: "GCash",
  ovo: "OVO", gopay: "GoPay", promptpay: "PromptPay", zalopay: "ZaloPay",
  qr_generic: "QR", other: "Other",
};

export default function PaymentsPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outletId, setOutletId] = useState("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<Payment | null>(null);
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetch("/api/outlets").then(r => r.json()).then(d => {
      const list = Array.isArray(d) ? d : [];
      setOutlets(list);
      if (list.length) setOutletId(String(list[0].id));
    });
  }, []);

  const load = useCallback(async () => {
    if (!outletId) return;
    setLoading(true);
    const url = `/api/payments?outlet_id=${outletId}${statusFilter !== "all" ? `&status=${statusFilter}` : ""}`;
    const res = await fetch(url);
    const data = await res.json();
    setPayments(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [outletId, statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function viewDetail(id: number) {
    const res = await fetch(`/api/payments/${id}`);
    setDetail(await res.json());
  }

  async function voidPayment() {
    if (!detail) return;
    setVoiding(true);
    await fetch(`/api/payments/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "void", void_reason: voidReason }),
    });
    setVoiding(false);
    setVoidOpen(false);
    setDetail(null);
    await load();
  }

  const columns: Column<Payment>[] = [
    {
      key: "payment_number", label: "Payment", sortable: true,
      render: p => (
        <div>
          <p className="font-mono font-semibold text-gray-900 text-sm">{p.payment_number}</p>
          <p className="text-xs text-gray-400">{p.order_number}</p>
        </div>
      ),
    },
    {
      key: "status", label: "Status", sortable: true,
      render: p => (
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLOR[p.status] ?? "bg-gray-100 text-gray-500"}`}>
          {p.status}
        </span>
      ),
    },
    {
      key: "total_amount", label: "Total", sortable: true,
      render: p => <span className="text-sm font-semibold text-gray-900">{parseFloat(String(p.total_amount)).toFixed(2)}</span>,
    },
    {
      key: "splits", label: "Method",
      render: p => {
        const splits = p.splits ?? [];
        return (
          <div className="flex flex-wrap gap-1">
            {splits.map((sp, i) => (
              <span key={i} className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-medium">
                {METHOD_LABEL[sp.method] ?? sp.method}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: "created_by_name", label: "Cashier",
      render: p => <span className="text-sm text-gray-600">{p.created_by_name ?? "—"}</span>,
    },
    {
      key: "created_at", label: "Time", sortable: true,
      render: p => (
        <span className="text-xs text-gray-500">
          {new Date(p.created_at).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
        </span>
      ),
    },
    {
      key: "actions", label: "",
      render: p => (
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-indigo-600" onClick={() => viewDetail(p.id)}>
          <Eye className="w-3.5 h-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Header title="Payments" subtitle="Payment records and void management" />
      <div className="p-6">
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <Select value={outletId} onValueChange={(v) => v && setOutletId(v)}>
            <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Select outlet" /></SelectTrigger>
            <SelectContent>{outlets.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {["completed","voided","refunded","pending"].map(s => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={load}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : (
          <DataTable data={payments} columns={columns} searchKeys={["payment_number","order_number","created_by_name"]} searchPlaceholder="Search payments..." pageSize={20} emptyMessage="No payments found." />
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Payment {detail?.payment_number}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${STATUS_COLOR[detail.status]}`}>{detail.status}</span>
                <span className="text-xs text-gray-500">{detail.order_number}</span>
                {detail.table_number && <span className="text-xs text-gray-500">Table {detail.table_number}</span>}
                {detail.customer_name && <span className="text-xs text-gray-500">{detail.customer_name}</span>}
              </div>

              <div className="border border-gray-100 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-xs text-gray-500"><span>Subtotal</span><span>{(parseFloat(String(detail.total_amount)) - parseFloat(String(detail.tax_amount))).toFixed(2)}</span></div>
                {parseFloat(String(detail.tax_amount)) > 0 && <div className="flex justify-between text-xs text-gray-500"><span>Tax</span><span>{parseFloat(String(detail.tax_amount)).toFixed(2)}</span></div>}
                {parseFloat(String(detail.discount_amount)) > 0 && <div className="flex justify-between text-xs text-red-500"><span>Discount</span><span>-{parseFloat(String(detail.discount_amount)).toFixed(2)}</span></div>}
                <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-100 pt-2"><span>Total</span><span>{parseFloat(String(detail.total_amount)).toFixed(2)}</span></div>
                <div className="flex justify-between text-xs text-gray-500"><span>Amount Paid</span><span>{parseFloat(String(detail.amount_paid)).toFixed(2)}</span></div>
                {parseFloat(String(detail.change_given)) > 0 && <div className="flex justify-between text-xs text-emerald-600 font-medium"><span>Change</span><span>{parseFloat(String(detail.change_given)).toFixed(2)}</span></div>}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment Methods</p>
                {(detail.splits ?? []).map((sp, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-sm font-medium text-gray-700">{METHOD_LABEL[sp.method] ?? sp.method}</span>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{parseFloat(String(sp.amount)).toFixed(2)}</p>
                      {sp.reference && <p className="text-[10px] text-gray-400">{sp.reference}</p>}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-400">Cashier: {detail.created_by_name ?? "—"} · {new Date(detail.created_at).toLocaleString("en-GB")}</p>

              {detail.status === "completed" && (
                <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50 gap-2" onClick={() => setVoidOpen(true)}>
                  <Ban className="w-4 h-4" /> Void Payment
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Void Confirm Dialog */}
      <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Void Payment</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-sm text-gray-600">This will void the payment and reopen the order. This action cannot be undone.</p>
            <div>
              <label className="text-xs font-medium text-gray-600">Reason (optional)</label>
              <Input className="mt-1" placeholder="Enter void reason..." value={voidReason} onChange={e => setVoidReason(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setVoidOpen(false)}>Cancel</Button>
            <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={voidPayment} disabled={voiding}>
              {voiding && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Void
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
