"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

const OUTLET_TYPES = [
  { value: "restaurant", label: "Restaurant" },
  { value: "cafe", label: "Cafe / Coffee Shop" },
  { value: "bakery", label: "Bakery & Confectionery" },
  { value: "food_truck", label: "Food Truck" },
  { value: "hawker", label: "Hawker / Food Court" },
  { value: "qsr", label: "Quick Service Restaurant (QSR)" },
  { value: "cloud_kitchen", label: "Cloud Kitchen" },
  { value: "bar", label: "Bar / Lounge" },
  { value: "tea_house", label: "Tea House" },
  { value: "juice_shop", label: "Juice Shop" },
];

export default function NewOutletPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", address: "", phone: "", email: "", outlet_type: "restaurant",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/outlets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error?.formErrors?.[0] ?? data.error ?? "Failed to create outlet");
      setLoading(false);
    } else {
      router.push("/dashboard/outlets");
    }
  }

  return (
    <div>
      <Header title="Add Outlet" subtitle="Add a new branch to your business" />
      <div className="p-6 max-w-xl">
        <Link href="/dashboard/outlets" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Outlets
        </Link>

        <Card className="border-gray-200 shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Outlet Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Outlet Name *</Label>
                <Input placeholder="e.g. Main Branch — KLCC" value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>

              <div className="space-y-1.5">
                <Label>Outlet Type *</Label>
                <Select value={form.outlet_type} onValueChange={(v) => setForm((f) => ({ ...f, outlet_type: v ?? f.outlet_type }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OUTLET_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input placeholder="+60 3 1234 5678" value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" placeholder="outlet@business.com" value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Address</Label>
                <Textarea placeholder="Full outlet address..." value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} rows={2} />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={loading}>
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : "Create Outlet"}
                </Button>
                <Link href="/dashboard/outlets">
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
