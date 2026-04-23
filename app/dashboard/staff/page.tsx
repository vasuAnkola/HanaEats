"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Loader2, Plus, ChevronLeft, ChevronRight, Trash2, Clock, CheckCircle, Banknote } from "lucide-react";

interface Outlet { id: number; name: string; }
interface StaffUser { id: number; name: string; role: string; }
interface Shift { id: number; user_id: number; user_name: string; shift_date: string; start_time: string; end_time: string; role_label: string | null; status: string; notes: string | null; }
interface Attendance { id: number; user_id: number; user_name: string; outlet_name: string | null; clock_in: string; clock_out: string | null; duration_minutes: number | null; notes: string | null; }
interface Commission { id: number; user_id: number; user_name: string; period_start: string; period_end: string; total_sales: number; commission_rate: number; commission_amount: number; order_count: number; status: string; notes: string | null; }

const STATUS_BADGE: Record<string,string> = { scheduled:"bg-blue-100 text-blue-700", completed:"bg-emerald-100 text-emerald-700", absent:"bg-red-100 text-red-600", pending:"bg-amber-100 text-amber-700", approved:"bg-indigo-100 text-indigo-700", paid:"bg-emerald-100 text-emerald-700" };

function weekStart(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff); d.setHours(0,0,0,0);
  return d;
}
function addDays(date: Date, n: number) { const d = new Date(date); d.setDate(d.getDate()+n); return d; }
function fmtDate(d: Date) { return d.toISOString().split("T")[0]; }
function fmtShort(d: Date) { return d.toLocaleDateString("en-GB",{weekday:"short",day:"2-digit",month:"short"}); }

export default function StaffPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outletId, setOutletId] = useState("");
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);

  // Schedule
  const [week, setWeek] = useState(() => weekStart(new Date()));
  const [shifts, setShifts] = useState<Shift[] | null>(null);
  const [shiftDialog, setShiftDialog] = useState(false);
  const [shiftForm, setShiftForm] = useState({ user_id:"", shift_date:"", start_time:"09:00", end_time:"17:00", role_label:"", notes:"" });

  // Attendance
  const [attendance, setAttendance] = useState<Attendance[] | null>(null);
  const [clockDialog, setClockDialog] = useState(false);
  const [clockUserId, setClockUserId] = useState("");

  // Commissions
  const [commissions, setCommissions] = useState<Commission[] | null>(null);
  const [commDialog, setCommDialog] = useState(false);
  const [commForm, setCommForm] = useState({ user_id:"", period_start:"", period_end:"", commission_rate:"5" });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/outlets").then(r=>r.json()).then(d => { const l = Array.isArray(d)?d:[]; setOutlets(l); if(l.length) setOutletId(String(l[0].id)); });
  }, []);

  useEffect(() => {
    if (!outletId) return;
    fetch("/api/users?outlet_id="+outletId).then(r=>r.json()).then(d=>setStaffUsers(Array.isArray(d)?d:[]));
  }, [outletId]);

  const loadShifts = useCallback(async () => {
    if (!outletId) return;
    setShifts(null);
    const res = await fetch("/api/scheduled-shifts?outlet_id="+outletId+"&week_start="+fmtDate(week));
    setShifts(Array.isArray(await res.json()) ? await (await fetch("/api/scheduled-shifts?outlet_id="+outletId+"&week_start="+fmtDate(week))).json() : []);
  }, [outletId, week]);

  const loadAttendance = useCallback(async () => {
    if (!outletId) return;
    setAttendance(null);
    const res = await fetch("/api/attendance?outlet_id="+outletId);
    const d = await res.json(); setAttendance(Array.isArray(d)?d:[]);
  }, [outletId]);

  const loadCommissions = useCallback(async () => {
    if (!outletId) return;
    setCommissions(null);
    const res = await fetch("/api/commissions?outlet_id="+outletId);
    const d = await res.json(); setCommissions(Array.isArray(d)?d:[]);
  }, [outletId]);

  useEffect(() => { loadShifts(); }, [loadShifts]);
  useEffect(() => { loadAttendance(); }, [loadAttendance]);
  useEffect(() => { loadCommissions(); }, [loadCommissions]);

  const days = Array.from({length:7}, (_,i) => addDays(week,i));

  async function addShift() {
    setSaving(true); setError("");
    const res = await fetch("/api/scheduled-shifts", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ outlet_id:parseInt(outletId), user_id:parseInt(shiftForm.user_id), shift_date:shiftForm.shift_date, start_time:shiftForm.start_time, end_time:shiftForm.end_time, role_label:shiftForm.role_label||null, notes:shiftForm.notes||null }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error??"Failed"); setSaving(false); return; }
    setShiftDialog(false); setSaving(false); loadShifts();
  }

  async function deleteShift(id: number) {
    await fetch("/api/scheduled-shifts/"+id, { method:"DELETE" }); loadShifts();
  }

  async function clockIn() {
    setSaving(true); setError("");
    const res = await fetch("/api/attendance", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ outlet_id:parseInt(outletId), user_id:parseInt(clockUserId) }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error??"Failed"); setSaving(false); return; }
    setClockDialog(false); setSaving(false); loadAttendance();
  }

  async function clockOut(id: number) {
    await fetch("/api/attendance", { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action:"clock_out", attendance_id:id }) });
    loadAttendance();
  }

  async function calcCommission() {
    setSaving(true); setError("");
    const res = await fetch("/api/commissions", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ outlet_id:parseInt(outletId), user_id:parseInt(commForm.user_id), period_start:commForm.period_start, period_end:commForm.period_end, commission_rate:parseFloat(commForm.commission_rate)||0 }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error??"Failed"); setSaving(false); return; }
    setCommDialog(false); setSaving(false); loadCommissions();
  }

  async function updateCommStatus(id: number, status: string) {
    await fetch("/api/commissions/"+id, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ status }) });
    loadCommissions();
  }

  const attColumns: Column<Attendance>[] = [
    { key:"user_name", label:"Staff", sortable:true, render: a => <span className="font-medium text-gray-900 text-sm">{a.user_name}</span> },
    { key:"clock_in", label:"Clock In", render: a => <span className="text-sm text-gray-700">{new Date(a.clock_in).toLocaleString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</span> },
    { key:"clock_out", label:"Clock Out", render: a => a.clock_out ? <span className="text-sm text-gray-700">{new Date(a.clock_out).toLocaleString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</span> : <span className="text-xs text-amber-600 font-medium">Still clocked in</span> },
    { key:"duration_minutes", label:"Duration", render: a => a.duration_minutes != null ? <span className="text-sm text-gray-600">{Math.floor(Number(a.duration_minutes)/60)}h {Number(a.duration_minutes)%60}m</span> : <span className="text-gray-400">—</span> },
    { key:"actions", label:"", render: a => !a.clock_out ? (
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => clockOut(a.id)}><Clock className="w-3.5 h-3.5 mr-1" />Clock Out</Button>
    ) : null },
  ];

  const commColumns: Column<Commission>[] = [
    { key:"user_name", label:"Staff", sortable:true, render: c => <span className="font-medium text-gray-900 text-sm">{c.user_name}</span> },
    { key:"period_start", label:"Period", render: c => <span className="text-xs text-gray-500">{new Date(c.period_start).toLocaleDateString("en-GB",{day:"2-digit",month:"short"})} — {new Date(c.period_end).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</span> },
    { key:"total_sales", label:"Sales", sortable:true, render: c => <span className="text-sm font-semibold text-gray-900">{parseFloat(String(c.total_sales)).toFixed(2)}</span> },
    { key:"commission_rate", label:"Rate", render: c => <span className="text-sm text-gray-600">{parseFloat(String(c.commission_rate)).toFixed(1)}%</span> },
    { key:"commission_amount", label:"Commission", sortable:true, render: c => <span className="text-sm font-bold text-indigo-700">{parseFloat(String(c.commission_amount)).toFixed(2)}</span> },
    { key:"status", label:"Status", render: c => <span className={"text-[10px] font-bold px-2 py-0.5 rounded-full uppercase " + (STATUS_BADGE[c.status]??"bg-gray-100 text-gray-500")}>{c.status}</span> },
    { key:"actions", label:"", render: c => (
      <div className="flex items-center gap-1">
        {c.status==="pending" && <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => updateCommStatus(c.id,"approved")}><CheckCircle className="w-3.5 h-3.5 mr-1" />Approve</Button>}
        {c.status==="approved" && <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => updateCommStatus(c.id,"paid")}><Banknote className="w-3.5 h-3.5 mr-1" />Mark Paid</Button>}
      </div>
    )},
  ];

  const OutletSelector = (
    <Select value={outletId} onValueChange={v => v && setOutletId(v)}>
      <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Select outlet" /></SelectTrigger>
      <SelectContent>{outlets.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}</SelectContent>
    </Select>
  );

  return (
    <div>
      <Header title="Staff Management" subtitle="Scheduling, attendance and commissions" />
      <div className="p-6">
        <Tabs defaultValue="schedule">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            {OutletSelector}
            <TabsList>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="commissions">Commissions</TabsTrigger>
            </TabsList>
          </div>

          {/* SCHEDULE TAB */}
          <TabsContent value="schedule">
            <div className="flex items-center gap-3 mb-4">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setWeek(w => addDays(w,-7))}><ChevronLeft className="w-4 h-4" /></Button>
              <span className="text-sm font-medium text-gray-700">Week of {fmtShort(week)}</span>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setWeek(w => addDays(w,7))}><ChevronRight className="w-4 h-4" /></Button>
              <div className="ml-auto">
                <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-sm" onClick={() => { setShiftForm({ user_id:"", shift_date:fmtDate(week), start_time:"09:00", end_time:"17:00", role_label:"", notes:"" }); setError(""); setShiftDialog(true); }}>
                  <Plus className="w-3.5 h-3.5" /> Add Shift
                </Button>
              </div>
            </div>

            {shifts === null ? <TableSkeleton rows={5} cols={7} /> : (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
                  {days.map(d => (
                    <div key={d.toISOString()} className="px-2 py-2.5 text-center">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase">{d.toLocaleDateString("en-GB",{weekday:"short"})}</p>
                      <p className="text-sm font-bold text-gray-700 mt-0.5">{d.getDate()}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 min-h-32 divide-x divide-gray-100">
                  {days.map(d => {
                    const dayStr = fmtDate(d);
                    const dayShifts = shifts.filter(s => s.shift_date === dayStr);
                    return (
                      <div key={dayStr} className="p-1.5 space-y-1">
                        {dayShifts.map(s => (
                          <div key={s.id} className="bg-indigo-50 border border-indigo-200 rounded-lg p-1.5 group relative">
                            <p className="text-[11px] font-semibold text-indigo-800 truncate">{s.user_name}</p>
                            <p className="text-[10px] text-indigo-600">{s.start_time.slice(0,5)}–{s.end_time.slice(0,5)}</p>
                            {s.role_label && <p className="text-[10px] text-indigo-400 truncate">{s.role_label}</p>}
                            <button onClick={() => deleteShift(s.id)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ATTENDANCE TAB */}
          <TabsContent value="attendance">
            <div className="flex justify-end mb-4">
              <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => { setClockUserId(""); setError(""); setClockDialog(true); }}>
                <Clock className="w-4 h-4" /> Clock In Staff
              </Button>
            </div>
            {attendance === null ? <TableSkeleton rows={6} cols={5} /> : (
              <DataTable data={attendance} columns={attColumns} searchKeys={["user_name"]} searchPlaceholder="Search staff..." pageSize={20} emptyMessage="No attendance records yet." />
            )}
          </TabsContent>

          {/* COMMISSIONS TAB */}
          <TabsContent value="commissions">
            <div className="flex justify-end mb-4">
              <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => { setCommForm({ user_id:"", period_start:"", period_end:"", commission_rate:"5" }); setError(""); setCommDialog(true); }}>
                <Plus className="w-4 h-4" /> Calculate Commission
              </Button>
            </div>
            {commissions === null ? <TableSkeleton rows={5} cols={7} /> : (
              <DataTable data={commissions} columns={commColumns} searchKeys={["user_name"]} searchPlaceholder="Search staff..." pageSize={20} emptyMessage="No commissions calculated yet." />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Shift Dialog */}
      <Dialog open={shiftDialog} onOpenChange={setShiftDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add Shift</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Staff Member</label>
              <Select value={shiftForm.user_id} onValueChange={v => v && setShiftForm(f=>({...f,user_id:v}))}>
                <SelectTrigger><SelectValue placeholder="Select staff..." /></SelectTrigger>
                <SelectContent>{staffUsers.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name} ({u.role})</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Date</label>
              <Input type="date" value={shiftForm.shift_date} onChange={e => setShiftForm(f=>({...f,shift_date:e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Start Time</label>
                <Input type="time" value={shiftForm.start_time} onChange={e => setShiftForm(f=>({...f,start_time:e.target.value}))} /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">End Time</label>
                <Input type="time" value={shiftForm.end_time} onChange={e => setShiftForm(f=>({...f,end_time:e.target.value}))} /></div>
            </div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Role / Label (optional)</label>
              <Input placeholder="e.g. Floor Staff, Kitchen" value={shiftForm.role_label} onChange={e => setShiftForm(f=>({...f,role_label:e.target.value}))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShiftDialog(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={addShift} disabled={saving||!shiftForm.user_id||!shiftForm.shift_date}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}Add Shift</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clock In Dialog */}
      <Dialog open={clockDialog} onOpenChange={setClockDialog}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>Clock In Staff</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Staff Member</label>
              <Select value={clockUserId} onValueChange={v => v && setClockUserId(v)}>
                <SelectTrigger><SelectValue placeholder="Select staff..." /></SelectTrigger>
                <SelectContent>{staffUsers.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}</SelectContent>
              </Select></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClockDialog(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={clockIn} disabled={saving||!clockUserId}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}Clock In</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Commission Dialog */}
      <Dialog open={commDialog} onOpenChange={setCommDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Calculate Commission</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Staff Member</label>
              <Select value={commForm.user_id} onValueChange={v => v && setCommForm(f=>({...f,user_id:v}))}>
                <SelectTrigger><SelectValue placeholder="Select staff..." /></SelectTrigger>
                <SelectContent>{staffUsers.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Period Start</label>
                <Input type="date" value={commForm.period_start} onChange={e => setCommForm(f=>({...f,period_start:e.target.value}))} /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Period End</label>
                <Input type="date" value={commForm.period_end} onChange={e => setCommForm(f=>({...f,period_end:e.target.value}))} /></div>
            </div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">Commission Rate (%)</label>
              <Input type="number" min="0" max="100" step="0.1" value={commForm.commission_rate} onChange={e => setCommForm(f=>({...f,commission_rate:e.target.value}))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCommDialog(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={calcCommission} disabled={saving||!commForm.user_id||!commForm.period_start||!commForm.period_end}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}Calculate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}