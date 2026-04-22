"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Outlet {
  id: number;
  name: string;
}

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "cashier", label: "Cashier" },
  { value: "waiter", label: "Waiter" },
  { value: "kitchen", label: "Kitchen Staff" },
];

export default function NewUserPage() {
  const router = useRouter();
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", email: "", password: "", role: "cashier", outlet_id: "",
  });

  useEffect(() => {
    fetch("/api/outlets").then((r) => r.json()).then(setOutlets).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const body: Record<string, unknown> = { ...form };
    if (form.outlet_id) body.outlet_id = Number(form.outlet_id);
    else delete body.outlet_id;

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error?.formErrors?.[0] ?? data.error ?? "Failed to create user");
      setLoading(false);
    } else {
      router.push("/dashboard/users");
    }
  }

  return (
    <div>
      <Header title="Add User" subtitle="Invite a team member to your account" />
      <div className="p-6 max-w-xl">
        <Link href="/dashboard/users" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Users
        </Link>

        <Card className="border-gray-200 shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">User Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Full Name *</Label>
                <Input placeholder="e.g. Ahmad Razif" value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>

              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" placeholder="staff@restaurant.com" value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
              </div>

              <div className="space-y-1.5">
                <Label>Password *</Label>
                <Input type="password" placeholder="Min 8 characters" value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required minLength={8} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Role *</Label>
                  <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v ?? f.role }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Outlet</Label>
                  <Select value={form.outlet_id} onValueChange={(v) => setForm((f) => ({ ...f, outlet_id: v ?? "" }))}>
                    <SelectTrigger><SelectValue placeholder="All outlets" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All outlets</SelectItem>
                      {outlets.map((o) => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={loading}>
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : "Create User"}
                </Button>
                <Link href="/dashboard/users">
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
