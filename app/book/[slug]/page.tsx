"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CalendarDays, CheckCircle, Users, MapPin } from "lucide-react";
import { localDateStr } from "@/lib/date";

interface Outlet { id: number; name: string; address: string | null; outlet_type: string; }

const empty = {
  outlet_id: "", customer_name: "", customer_email: "", customer_phone: "",
  party_size: "2", reservation_date: "", reservation_time: "", special_requests: "",
};

export default function PublicBookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<{ reservation_number: string; reservation_date: string; reservation_time: string; party_size: number } | null>(null);

  useEffect(() => {
    fetch(`/api/public/${slug}`).then(async r => {
      if (!r.ok) { setNotFound(true); return; }
      const data = await r.json();
      setTenantName(data.tenant.name);
      setOutlets(Array.isArray(data.outlets) ? data.outlets : []);
      if (data.outlets?.length === 1) setForm(f => ({ ...f, outlet_id: String(data.outlets[0].id) }));
    }).catch(() => setNotFound(true));
  }, [slug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaving(true);
    const res = await fetch(`/api/public/${slug}/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? "Couldn't book that table — try a different time."); return; }
    setConfirmation(data);
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-lg font-semibold text-gray-800">We couldn&apos;t find that restaurant</p>
          <p className="text-sm text-gray-500 mt-1">Double-check the link you were given.</p>
        </div>
      </div>
    );
  }

  if (confirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center">
          <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900">Table requested!</h1>
          <p className="text-sm text-gray-500 mt-1">{tenantName} will confirm your booking shortly.</p>
          <div className="mt-6 bg-gray-50 rounded-xl p-4 text-left space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Reference</span><span className="font-mono font-semibold text-gray-800">{confirmation.reservation_number}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Date</span><span className="font-medium text-gray-800">{new Date(confirmation.reservation_date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Time</span><span className="font-medium text-gray-800">{confirmation.reservation_time?.slice(0, 5)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Party size</span><span className="font-medium text-gray-800">{confirmation.party_size}</span></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
        <div className="flex items-center gap-2 mb-1 text-brand-primary">
          <CalendarDays className="w-5 h-5" />
          <span className="text-xs font-semibold uppercase tracking-wide">Book a table</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{tenantName ?? <Loader2 className="w-5 h-5 animate-spin text-gray-300" />}</h1>

        <form onSubmit={submit} className="space-y-4">
          {outlets.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-400" /> Location</Label>
              <Select value={form.outlet_id} onValueChange={v => v && setForm(f => ({ ...f, outlet_id: v }))}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Choose a location" /></SelectTrigger>
                <SelectContent>{outlets.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.name}{o.address ? ` — ${o.address}` : ""}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bk-date" className="text-sm font-medium text-gray-700">Date</Label>
              <Input id="bk-date" type="date" required min={localDateStr()} value={form.reservation_date} onChange={e => setForm(f => ({ ...f, reservation_date: e.target.value }))} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bk-time" className="text-sm font-medium text-gray-700">Time</Label>
              <Input id="bk-time" type="time" required value={form.reservation_time} onChange={e => setForm(f => ({ ...f, reservation_time: e.target.value }))} className="h-11" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bk-party" className="text-sm font-medium text-gray-700 flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-gray-400" /> Party size</Label>
            <Input id="bk-party" type="number" min={1} max={50} required value={form.party_size} onChange={e => setForm(f => ({ ...f, party_size: e.target.value }))} className="h-11" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bk-name" className="text-sm font-medium text-gray-700">Your name</Label>
            <Input id="bk-name" required value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} className="h-11" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bk-phone" className="text-sm font-medium text-gray-700">Phone</Label>
              <Input id="bk-phone" type="tel" value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bk-email" className="text-sm font-medium text-gray-700">Email (optional)</Label>
              <Input id="bk-email" type="email" value={form.customer_email} onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))} className="h-11" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bk-notes" className="text-sm font-medium text-gray-700">Special requests (optional)</Label>
            <Input id="bk-notes" placeholder="Window seat, high chair, celebration…" value={form.special_requests} onChange={e => setForm(f => ({ ...f, special_requests: e.target.value }))} className="h-11" />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}

          <Button type="submit" className="w-full h-11 font-semibold" disabled={saving || !form.outlet_id}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Request Table
          </Button>
        </form>
      </div>
    </div>
  );
}
