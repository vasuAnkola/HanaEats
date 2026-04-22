"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Loader2, Play, Square, Eye } from "lucide-react";

interface Outlet { id: number; name: string; }
interface Shift {
  id: number; cashier_name: string; opening_float: number;
  closing_float: number | null; opening_at: string; closing_at: string | null;
  status: string; notes: string | null;
  cash_collected?: number; total_sales?: number; order_count?: number;
}

export default function ShiftsPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outletId, setOutletId] = useState("");
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [openingFloat, setOpeningFloat] = useState("0");
  const [closingFloat, setClosingFloat] = useState("0");
  const [closeNotes, setCloseNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
    const res = await fetch(`/api/shifts?outlet_id=${outletId}`);
    const data = await res.json();
    setShifts(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [outletId]);

  useEffect(() => { load(); }, [load]);

  const openShift = shifts.find(s => s.status === "open");

  async function startShift() {
    setSaving(true); setError("");
    const res = await fetch("/api/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outlet_id: parseInt(outletId), opening_float: parseFloat(openingFloat) || 0 }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed"); setSaving(false); return; }
    setOpenDialog(false); setSaving(false); setOpeningFloat("0");
    await load();
  }

  async function closeShift() {
    if (!openShift) return;
    setSaving(true); setError("");
    const res = await fetch(`/api/shifts/${openShift.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ closing_float: parseFloat(closingFloat) || 0, notes: closeNotes }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed"); setSaving(false); return; }
    setCloseDialog(false); setSaving(false); setClosingFloat("0"); setCloseNotes("");
    await load();
  }

  async function viewDetail(shift: Shift) {
    const res = await fetch(`/api/shifts/${shift.id}`);
    const data = await res.json();
    setSelectedShift(data);
    setDetailDialog(true);
  }

  const columns: Column<Shift>[] = [
    {
      key: "cashier_name", label: "Cashier", sortable: true,
      render: s => <span className="text-sm font-medium text-gray-900">{s.cashier_name}</span>,
    },
    {
      key: "status", label: "Status",
      render: s => (
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.status === "open" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
          {s.status}
        </span>
      ),
    },
    {
      key: "opening_float", label: "Opening Float",
      render: s => <span className="text-sm text-gray-700">{parseFloat(String(s.opening_float)).toFixed(2)}</span>,
    },
    {
      key: "closing_float", label: "Closing Float",
      render: s => <span className="text-sm text-gray-700">{s.closing_float != null ? parseFloat(String(s.closing_float)).toFixed(2) : "—"}</span>,
    },
    {
      key: "opening_at", label: "Opened", sortable: true,
      render: s => (
        <span className="text-xs text-gray-500">
          {new Date(s.opening_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
        </span>
      ),
    },
    {
      key: "closing_at", label: "Closed",
      render: s => (
        <span className="text-xs text-gray-500">
          {s.closing_at ? new Date(s.closing_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
        </span>
      ),
    },
    {
      key: "actions", label: "",
      render: s => (
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-indigo-600" onClick={() => viewDetail(s)}>
          <Eye className="w-3.5 h-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Header title="Shift Management" subtitle="Track cashier shifts and daily cash float" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <Select value={outletId} onValueChange={(v) => v && setOutletId(v)}>
            <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Select outlet" /></SelectTrigger>
            <SelectContent>{outlets.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}</SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            {openShift ? (
              <Button className="bg-red-600 hover:bg-red-700 text-white gap-2 h-9" onClick={() => { setError(""); setCloseDialog(true); }}>
                <Square className="w-3.5 h-3.5" /> Close Shift
              </Button>
            ) : (
              <Button className="gap-2 h-9" onClick={() => { setError(""); setOpenDialog(true); }}>
                <Play className="w-3.5 h-3.5" /> Open Shift
              </Button>
            )}
          </div>
        </div>

        {openShift && (
          <div className="mb-5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Shift in progress — {openShift.cashier_name}</p>
              <p className="text-xs text-emerald-600">Opened {new Date(openShift.opening_at).toLocaleString("en-GB")} · Float: {parseFloat(String(openShift.opening_float)).toFixed(2)}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : (
          <DataTable data={shifts} columns={columns} searchKeys={["cashier_name","status"]} searchPlaceholder="Search shifts..." pageSize={20} emptyMessage="No shifts yet." />
        )}
      </div>

      {/* Open Shift Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Open Shift</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div>
              <label className="text-xs font-medium text-gray-600">Opening Cash Float</label>
              <Input type="number" min="0" step="0.01" className="mt-1" value={openingFloat} onChange={e => setOpeningFloat(e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">Cash amount in the drawer at shift start</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button onClick={startShift} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Open Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Shift Dialog */}
      <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Close Shift</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div>
              <label className="text-xs font-medium text-gray-600">Closing Cash in Drawer</label>
              <Input type="number" min="0" step="0.01" className="mt-1" value={closingFloat} onChange={e => setClosingFloat(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Notes (optional)</label>
              <Input className="mt-1" placeholder="Any notes for this shift..." value={closeNotes} onChange={e => setCloseNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialog(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={closeShift} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Close Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shift Detail Dialog */}
      <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Shift Summary</DialogTitle></DialogHeader>
          {selectedShift && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#5C432B]/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-[#5C432B]">{Number(selectedShift.order_count ?? 0)}</p>
                  <p className="text-xs text-[#5C432B]/60 mt-0.5">Orders</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{parseFloat(String(selectedShift.total_sales ?? 0)).toFixed(2)}</p>
                  <p className="text-xs text-emerald-500 mt-0.5">Total Sales</p>
                </div>
              </div>
              <div className="border border-gray-100 rounded-xl divide-y divide-gray-100">
                <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-gray-500">Cashier</span><span className="font-medium">{selectedShift.cashier_name}</span></div>
                <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-gray-500">Opening Float</span><span className="font-medium">{parseFloat(String(selectedShift.opening_float)).toFixed(2)}</span></div>
                <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-gray-500">Cash Collected</span><span className="font-medium">{parseFloat(String(selectedShift.cash_collected ?? 0)).toFixed(2)}</span></div>
                {selectedShift.closing_float != null && (
                  <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-gray-500">Closing Float</span><span className="font-medium">{parseFloat(String(selectedShift.closing_float)).toFixed(2)}</span></div>
                )}
                <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-gray-500">Opened</span><span className="text-gray-700 text-xs">{new Date(selectedShift.opening_at).toLocaleString("en-GB")}</span></div>
                {selectedShift.closing_at && (
                  <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-gray-500">Closed</span><span className="text-gray-700 text-xs">{new Date(selectedShift.closing_at).toLocaleString("en-GB")}</span></div>
                )}
                {selectedShift.notes && (
                  <div className="px-4 py-2.5 text-sm"><span className="text-gray-500 block">Notes</span><span className="text-gray-700">{selectedShift.notes}</span></div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
