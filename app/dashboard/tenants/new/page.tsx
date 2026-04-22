"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Loader2, ArrowLeft, Building2, UserCog } from "lucide-react";
import Link from "next/link";

interface Country {
  id: number;
  name: string;
  code: string;
  currency_code: string;
  currency_symbol: string;
  tax_name: string | null;
  tax_rate: string;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function NewTenantPage() {
  const router = useRouter();
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    // Tenant details
    name: "",
    slug: "",
    country_id: "",
    email: "",
    phone: "",
    address: "",
    plan: "starter",
    // Admin account
    admin_name: "",
    admin_email: "",
    admin_password: "",
  });

  useEffect(() => {
    fetch("/api/countries").then((r) => r.json()).then(setCountries);
  }, []);

  function handleNameChange(value: string) {
    setForm((f) => ({ ...f, name: value, slug: slugify(value) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, country_id: Number(form.country_id) }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error?.formErrors?.[0] ?? data.error ?? "Failed to create tenant");
      setLoading(false);
    } else {
      router.push("/dashboard/tenants");
    }
  }

  const selectedCountry = countries.find((c) => String(c.id) === form.country_id);

  return (
    <div>
      <Header title="Add Tenant" subtitle="Register a new business on the platform" />
      <div className="p-6 max-w-2xl">
        <Link href="/dashboard/tenants" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Tenants
        </Link>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Business Details */}
          <Card className="border-gray-200 shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#5C432B]" />
                Business Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label>Business Name *</Label>
                  <Input
                    placeholder="e.g. Golden Dragon Restaurant"
                    value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                  />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <Label>Slug *</Label>
                  <Input
                    placeholder="golden-dragon"
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                    required
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-400">Lowercase letters, numbers, and hyphens only.</p>
                </div>

                <div className="col-span-2 space-y-1.5">
                  <Label>Country *</Label>
                  <Select value={form.country_id} onValueChange={(v) => setForm((f) => ({ ...f, country_id: v ?? f.country_id }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country..." />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name} — {c.currency_code} ({c.currency_symbol})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCountry && (
                    <p className="text-xs text-gray-400">
                      Tax: {selectedCountry.tax_name ?? "None"} — {selectedCountry.tax_rate}%
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Business Email *</Label>
                  <Input
                    type="email"
                    placeholder="owner@restaurant.com"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input
                    placeholder="+60 12 345 6789"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <Label>Address</Label>
                  <Textarea
                    placeholder="Business address..."
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    rows={2}
                  />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <Label>Plan *</Label>
                  <Select value={form.plan} onValueChange={(v) => setForm((f) => ({ ...f, plan: v ?? f.plan }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter — Basic POS features</SelectItem>
                      <SelectItem value="pro">Pro — Full features + analytics</SelectItem>
                      <SelectItem value="enterprise">Enterprise — Multi-branch + AI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Account */}
          <Card className="border-gray-200 shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <UserCog className="w-4 h-4 text-[#5C432B]" />
                Admin Account
              </CardTitle>
              <p className="text-xs text-gray-400">
                This person will be the business admin — they log in and manage outlets, staff, and menu.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Full Name *</Label>
                <Input
                  placeholder="e.g. Ahmad Razif"
                  value={form.admin_name}
                  onChange={(e) => setForm((f) => ({ ...f, admin_name: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Login Email *</Label>
                  <Input
                    type="email"
                    placeholder="admin@restaurant.com"
                    value={form.admin_email}
                    onChange={(e) => setForm((f) => ({ ...f, admin_email: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Password *</Label>
                  <Input
                    type="password"
                    placeholder="Min 8 characters"
                    value={form.admin_password}
                    onChange={(e) => setForm((f) => ({ ...f, admin_password: e.target.value }))}
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <div className="bg-[#5C432B]/10 border border-[#5C432B]/20 rounded-lg px-3 py-2">
                <p className="text-xs text-[#5C432B]">
                  Share these credentials with the business owner. They can change the password after first login.
                </p>
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : "Create Tenant & Admin"}
            </Button>
            <Link href="/dashboard/tenants">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
