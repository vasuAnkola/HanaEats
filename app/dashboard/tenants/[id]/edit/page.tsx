"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Loader2, ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";

interface TenantData {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  plan: string;
  is_active: boolean;
  country_name: string;
}

export default function EditTenantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", email: "", phone: "", address: "", plan: "starter",
  });
  const [countryName, setCountryName] = useState("");

  useEffect(() => {
    fetch(`/api/tenants/${id}`)
      .then((r) => r.json())
      .then((data: TenantData) => {
        setForm({
          name: data.name,
          email: data.email,
          phone: data.phone ?? "",
          address: data.address ?? "",
          plan: data.plan,
        });
        setCountryName(data.country_name);
        setFetching(false);
      });
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch(`/api/tenants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        address: form.address || null,
        plan: form.plan,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to update tenant");
      setLoading(false);
    } else {
      router.push(`/dashboard/tenants/${id}`);
    }
  }

  if (fetching) {
    return (
      <div>
        <Header title="Edit Tenant" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Edit Tenant" subtitle={form.name} />
      <div className="p-6 max-w-2xl">
        <Link href={`/dashboard/tenants/${id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Tenant
        </Link>

        <Card className="border-gray-200 shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" /> Business Details
            </CardTitle>
            <p className="text-xs text-gray-400">Country cannot be changed after creation.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Business Name *</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>

              <div className="space-y-1.5">
                <Label>Country</Label>
                <Input value={countryName} disabled className="bg-gray-50 text-gray-400" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Contact Email *</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+60 12 345 6789" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Address</Label>
                <Textarea value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} rows={2} />
              </div>

              <div className="space-y-1.5">
                <Label>Plan *</Label>
                <Select value={form.plan} onValueChange={(v) => setForm((f) => ({ ...f, plan: v ?? f.plan }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter — Basic POS features</SelectItem>
                    <SelectItem value="pro">Pro — Full features + analytics</SelectItem>
                    <SelectItem value="enterprise">Enterprise — Multi-branch + AI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={loading}>
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
                </Button>
                <Link href={`/dashboard/tenants/${id}`}>
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
