"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Trash2, Users, RefreshCw, Sparkles, Utensils, Clock, Ban } from "lucide-react";

interface Outlet { id: number; name: string; }
interface TableRow {
  id: number; table_number: string; capacity: number;
  status: string; section_name: string | null;
}

const STATUS_STYLE: Record<string, { card: string; badge: string; label: string }> = {
  available: {
    card:  "bg-emerald-50 border-emerald-300 text-emerald-900",
    badge: "bg-emerald-200 text-emerald-800",
    label: "Available",
  },
  occupied: {
    card:  "bg-red-50 border-red-300 text-red-900",
    badge: "bg-red-200 text-red-800",
    label: "Occupied",
  },
  reserved: {
    card:  "bg-amber-50 border-amber-300 text-amber-900",
    badge: "bg-amber-200 text-amber-800",
    label: "Reserved",
  },
  cleaning: {
    card:  "bg-blue-50 border-blue-300 text-blue-900",
    badge: "bg-blue-200 text-blue-800",
    label: "Cleaning",
  },
};

// What action button to show per status
const STATUS_ACTIONS: Record<string, { next: string; label: string; icon: React.ReactNode }[]> = {
  available: [],
  occupied:  [{ next: "cleaning", label: "Mark Cleaning", icon: <Sparkles className="w-3 h-3" /> }],
  reserved:  [{ next: "occupied", label: "Seat Guests",   icon: <Utensils className="w-3 h-3" /> }, { next: "available", label: "Cancel Reserve", icon: <Ban className="w-3 h-3" /> }],
  cleaning:  [{ next: "available", label: "Mark Available", icon: <Sparkles className="w-3 h-3" /> }],
};

export default function TablesPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<string>("");
  const [tables, setTables] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ table_number: "", capacity: "4" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [changingId, setChangingId] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/outlets").then(r => r.json()).then(d => {
      const list = Array.isArray(d) ? d : [];
      setOutlets(list);
      if (list.length > 0) setSelectedOutlet(String(list[0].id));
    });
  }, []);

  const loadTables = useCallback(async (silent = false) => {
    if (!selectedOutlet) return;
    if (!silent) setLoading(true);
    const res = await fetch(`/api/tables?outlet_id=${selectedOutlet}`);
    const data = await res.json();
    setTables(Array.isArray(data) ? data : []);
    if (!silent) setLoading(false);
  }, [selectedOutlet]);

  useEffect(() => {
    loadTables();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => loadTables(true), 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loadTables]);

  async function addTable() {
    setSaving(true); setError("");
    const res = await fetch("/api/tables", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outlet_id: parseInt(selectedOutlet), table_number: form.table_number, capacity: parseInt(form.capacity) || 4 }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed"); setSaving(false); return; }
    setDialog(false); setForm({ table_number: "", capacity: "4" }); setSaving(false);
    await loadTables();
  }

  async function deleteTable(id: number) {
    if (!confirm("Delete this table?")) return;
    await fetch(`/api/tables/${id}`, { method: "DELETE" });
    await loadTables();
  }

  async function changeStatus(id: number, status: string) {
    setChangingId(id);
    await fetch(`/api/tables/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setChangingId(null);
    await loadTables(true);
  }

  const counts = {
    available: tables.filter(t => t.status === "available").length,
    occupied:  tables.filter(t => t.status === "occupied").length,
    reserved:  tables.filter(t => t.status === "reserved").length,
    cleaning:  tables.filter(t => t.status === "cleaning").length,
  };

  return (
    <div>
      <Header title="Tables" subtitle="Floor layout and live table status" />
      <div className="p-6">

        {/* Summary bar */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <Select value={selectedOutlet} onValueChange={(v) => v && setSelectedOutlet(v)}>
            <SelectTrigger className="w-48 h-9"><SelectValue placeholder="Select outlet" /></SelectTrigger>
            <SelectContent>
              {outlets.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Status count pills */}
          <div className="flex items-center gap-2">
            {(["available","occupied","reserved","cleaning"] as const).map(s => (
              <span key={s} className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${STATUS_STYLE[s].card}`}>
                {counts[s]} {STATUS_STYLE[s].label}
              </span>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => loadTables()} className="text-gray-400 hover:text-indigo-600 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <span className="text-[10px] text-gray-400">Auto-refreshes every 30s</span>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 h-9 ml-2" onClick={() => { setError(""); setDialog(true); }}>
              <Plus className="w-4 h-4" /> Add Table
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : tables.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
            <p className="text-gray-400 text-sm">No tables yet. Add your first table.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {tables.map(t => {
              const style = STATUS_STYLE[t.status] ?? STATUS_STYLE.available;
              const actions = STATUS_ACTIONS[t.status] ?? [];
              const isChanging = changingId === t.id;
              return (
                <div key={t.id} className={`border-2 rounded-xl p-3 transition-all flex flex-col gap-2 ${style.card}`}>
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <p className="font-bold text-xl leading-none">{t.table_number}</p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${style.badge}`}>
                      {style.label}
                    </span>
                  </div>

                  {/* Capacity + section */}
                  <div className="flex items-center gap-1 text-xs opacity-60">
                    <Users className="w-3 h-3" /> {t.capacity} seats
                  </div>
                  {t.section_name && (
                    <p className="text-[10px] opacity-50 -mt-1">{t.section_name}</p>
                  )}

                  {/* Action buttons */}
                  {isChanging ? (
                    <div className="flex justify-center py-1">
                      <Loader2 className="w-4 h-4 animate-spin opacity-50" />
                    </div>
                  ) : (
                    <div className="space-y-1 mt-auto">
                      {actions.map(a => (
                        <button key={a.next} onClick={() => changeStatus(t.id, a.next)}
                          className="w-full flex items-center justify-center gap-1 text-[10px] font-semibold bg-white/60 hover:bg-white/90 rounded-lg py-1 transition-colors border border-white/40">
                          {a.icon} {a.label}
                        </button>
                      ))}
                      {/* Manual override for any status — only shown on hover via the select */}
                      <Select value={t.status} onValueChange={(v) => v && changeStatus(t.id, v)}>
                        <SelectTrigger className="h-6 text-[10px] bg-white/40 hover:bg-white/70 border-white/40 shadow-none px-1.5 w-full">
                          <span className="opacity-60">Change status…</span>
                        </SelectTrigger>
                        <SelectContent>
                          {["available","occupied","reserved","cleaning"].map(s => (
                            <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button onClick={() => deleteTable(t.id)}
                        className="w-full flex items-center justify-center gap-1 text-[10px] text-red-400 hover:text-red-600 py-0.5 transition-colors">
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-6 flex-wrap text-xs text-gray-500">
          <div className="flex items-center gap-1.5"><Utensils className="w-3.5 h-3.5 text-emerald-500" /><span><strong>Available</strong> — ready for guests</span></div>
          <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-red-500" /><span><strong>Occupied</strong> — order in progress. Freed automatically when payment is collected.</span></div>
          <div className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-blue-500" /><span><strong>Cleaning</strong> — being cleaned, mark available when ready</span></div>
          <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-500" /><span><strong>Reserved</strong> — booking held</span></div>
        </div>
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add Table</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div>
              <label className="text-xs font-medium text-gray-600">Table Number / Name</label>
              <Input className="mt-1" placeholder="e.g. T1, A3, Counter" value={form.table_number} onChange={e => setForm(f => ({ ...f, table_number: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Capacity (seats)</label>
              <Input type="number" min="1" className="mt-1" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={addTable} disabled={saving || !form.table_number}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Add Table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
