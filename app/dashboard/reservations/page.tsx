"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Eye, Loader2, RefreshCw } from "lucide-react";

interface Outlet { id: number; name: string; }
interface TableRow { id: number; table_number: string; capacity: number; status: string; }
interface Reservation {
  id: number;
  reservation_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  table_id: number | null;
  table_number: string | null;
  status: string;
  special_requests: string | null;
  notes: string | null;
  created_at: string;
}

const STATUS_BADGE: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  seated:    "bg-emerald-100 text-emerald-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-600",
  no_show:   "bg-red-100 text-red-600",
};

const STATUS_OPTIONS = ["all", "pending", "confirmed", "seated", "completed", "cancelled", "no_show"];

const EMPTY_FORM = {
  customer_name: "", customer_email: "", customer_phone: "",
  party_size: "2", reservation_date: "", reservation_time: "",
  table_id: "", special_requests: "",
};

export default function ReservationsPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outletId, setOutletId] = useState("");
  const [tables, setTables] = useState<TableRow[]>([]);
  const [reservations, setReservations] = useState<Reservation[] | null>(null);
  const [date, setDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [newDialog, setNewDialog] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [detailRes, setDetailRes] = useState<Reservation | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [updating, setUpdating] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/outlets").then(r => r.json()).then(d => {
      const list = Array.isArray(d) ? d : [];
      setOutlets(list);
      if (list.length > 0) setOutletId(String(list[0].id));
    });
  }, []);

  useEffect(() => {
    if (!outletId) return;
    fetch(`/api/tables?outlet_id=${outletId}`).then(r => r.json()).then(d => {
      setTables(Array.isArray(d) ? d : []);
    });
  }, [outletId]);

  const loadReservations = useCallback(async () => {
    setReservations(null);
    const qs = new URLSearchParams();
    if (outletId) qs.set("outlet_id", outletId);
    if (date) qs.set("date", date);
    if (statusFilter !== "all") qs.set("status", statusFilter);
    const res = await fetch(`/api/reservations?${qs.toString()}`);
    const data = await res.json();
    setReservations(Array.isArray(data) ? data : []);
  }, [outletId, date, statusFilter]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  async function quickAction(id: number, status: string) {
    setUpdating(id);
    await fetch(`/api/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setUpdating(null);
    if (detailOpen && detailRes?.id === id) {
      setDetailRes(prev => prev ? { ...prev, status } : null);
    }
    await loadReservations();
  }

  async function createReservation() {
    setSaving(true); setFormError("");
    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outlet_id: parseInt(outletId),
        customer_name: form.customer_name,
        customer_email: form.customer_email || null,
        customer_phone: form.customer_phone || null,
        party_size: parseInt(form.party_size) || 2,
        reservation_date: form.reservation_date,
        reservation_time: form.reservation_time,
        table_id: form.table_id ? parseInt(form.table_id) : null,
        special_requests: form.special_requests || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setFormError(data.error ?? "Failed"); setSaving(false); return; }
    setNewDialog(false); setForm(EMPTY_FORM); setSaving(false);
    await loadReservations();
  }

  const columns: Column<Reservation>[] = [
    {
      key: "reservation_number",
      label: "Reservation #",
      render: (r) => <span className="font-mono text-xs font-semibold">{r.reservation_number}</span>,
    },
    {
      key: "customer_name",
      label: "Customer",
      render: (r) => (
        <div>
          <p className="font-medium text-sm">{r.customer_name}</p>
          {r.customer_phone && <p className="text-xs text-gray-500">{r.customer_phone}</p>}
        </div>
      ),
    },
    {
      key: "reservation_date",
      label: "Date / Time",
      render: (r) => (
        <div>
          <p className="text-sm">{new Date(r.reservation_date).toLocaleDateString()}</p>
          <p className="text-xs text-gray-500">{r.reservation_time.slice(0, 5)}</p>
        </div>
      ),
    },
    {
      key: "party_size",
      label: "Party",
      render: (r) => <span className="text-sm">{r.party_size} pax</span>,
    },
    {
      key: "table_number",
      label: "Table",
      render: (r) => <span className="text-sm">{r.table_number ?? "—"}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_BADGE[r.status] ?? "bg-gray-100 text-gray-600"}`}>
          {r.status.replace("_", " ")}
        </span>
      ),
    },
    {
      key: "id",
      label: "Actions",
      render: (r) => (
        <div className="flex items-center gap-1">
          {r.status === "pending" && (
            <button
              onClick={() => quickAction(r.id, "confirmed")}
              disabled={updating === r.id}
              className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 font-semibold"
            >
              Confirm
            </button>
          )}
          {r.status === "confirmed" && (
            <button
              onClick={() => quickAction(r.id, "seated")}
              disabled={updating === r.id}
              className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-semibold"
            >
              Seat
            </button>
          )}
          {r.status === "seated" && (
            <button
              onClick={() => quickAction(r.id, "completed")}
              disabled={updating === r.id}
              className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 font-semibold"
            >
              Complete
            </button>
          )}
          {(r.status === "pending" || r.status === "confirmed") && (
            <button
              onClick={() => quickAction(r.id, "no_show")}
              disabled={updating === r.id}
              className="text-[10px] px-2 py-0.5 rounded bg-red-100 text-red-600 hover:bg-red-200 font-semibold"
            >
              No-show
            </button>
          )}
          {(r.status === "pending" || r.status === "confirmed") && (
            <button
              onClick={() => quickAction(r.id, "cancelled")}
              disabled={updating === r.id}
              className="text-[10px] px-2 py-0.5 rounded bg-red-50 text-red-500 hover:bg-red-100 font-semibold"
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => { setDetailRes(r); setDetailOpen(true); }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <Eye className="w-3.5 h-3.5 text-gray-400" />
          </button>
          {updating === r.id && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <Header title="Reservations" subtitle="Table booking management" />
      <div className="p-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <Select value={outletId} onValueChange={(v) => v && setOutletId(v)}>
            <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Outlet" /></SelectTrigger>
            <SelectContent>{outlets.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}</SelectContent>
          </Select>

          <Input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-40 h-9"
          />

          <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
            <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(s => (
                <SelectItem key={s} value={s}>{s === "all" ? "All Statuses" : s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={loadReservations} variant="ghost" size="icon" className="text-gray-400 hover:text-indigo-600">
            <RefreshCw className="w-4 h-4" />
          </Button>

          <div className="ml-auto">
            <Button
              className="gap-1.5 h-9"
              onClick={() => { setFormError(""); setNewDialog(true); }}
              disabled={!outletId}
            >
              <Plus className="w-4 h-4" /> New Reservation
            </Button>
          </div>
        </div>

        {reservations === null ? (
          <TableSkeleton rows={6} cols={7} />
        ) : (
          <DataTable columns={columns} data={reservations} />
        )}
      </div>

      {/* New Reservation Dialog */}
      <Dialog open={newDialog} onOpenChange={setNewDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>New Reservation</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {formError && <p className="col-span-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600">Customer Name *</label>
              <Input className="mt-1" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Email</label>
              <Input type="email" className="mt-1" value={form.customer_email} onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Phone</label>
              <Input className="mt-1" value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Date *</label>
              <Input type="date" className="mt-1" value={form.reservation_date} onChange={e => setForm(f => ({ ...f, reservation_date: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Time *</label>
              <Input type="time" className="mt-1" value={form.reservation_time} onChange={e => setForm(f => ({ ...f, reservation_time: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Party Size</label>
              <Input type="number" min="1" className="mt-1" value={form.party_size} onChange={e => setForm(f => ({ ...f, party_size: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Table</label>
              <Select value={form.table_id} onValueChange={(v) => v && setForm(f => ({ ...f, table_id: v }))}>
                <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select table" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No table assigned</SelectItem>
                  {tables.map(t => <SelectItem key={t.id} value={String(t.id)}>T{t.table_number} ({t.capacity} seats)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600">Special Requests</label>
              <Textarea className="mt-1" rows={2} value={form.special_requests} onChange={e => setForm(f => ({ ...f, special_requests: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialog(false)}>Cancel</Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={createReservation}
              disabled={saving || !form.customer_name || !form.reservation_date || !form.reservation_time}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Create Reservation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Reservation Detail</DialogTitle></DialogHeader>
          {detailRes && (
            <div className="space-y-3 py-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Number</span>
                <span className="font-mono font-semibold">{detailRes.reservation_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_BADGE[detailRes.status]}`}>
                  {detailRes.status.replace("_", " ")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Customer</span>
                <span className="font-medium">{detailRes.customer_name}</span>
              </div>
              {detailRes.customer_email && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span>{detailRes.customer_email}</span>
                </div>
              )}
              {detailRes.customer_phone && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Phone</span>
                  <span>{detailRes.customer_phone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span>{new Date(detailRes.reservation_date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Time</span>
                <span>{detailRes.reservation_time.slice(0, 5)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Party Size</span>
                <span>{detailRes.party_size} pax</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Table</span>
                <span>{detailRes.table_number ?? "Not assigned"}</span>
              </div>
              {detailRes.special_requests && (
                <div>
                  <span className="text-gray-500 block mb-1">Special Requests</span>
                  <p className="text-gray-700 bg-gray-50 rounded p-2 text-xs">{detailRes.special_requests}</p>
                </div>
              )}
              {detailRes.notes && (
                <div>
                  <span className="text-gray-500 block mb-1">Notes</span>
                  <p className="text-gray-700 bg-gray-50 rounded p-2 text-xs">{detailRes.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
