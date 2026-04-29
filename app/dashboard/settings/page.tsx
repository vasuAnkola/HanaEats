"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Building2,
  Bell,
  Shield,
  Palette,
  Receipt,
  Globe,
  Save,
  Check,
  User,
  Mail,
  Phone,
  MapPin,
  Clock,
  DollarSign,
  Percent,
  Printer,
  Wifi,
  Moon,
  Sun,
  Monitor,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  ChevronRight,
} from "lucide-react";

type ThemeValue = "light" | "dark" | "system";

function applyTheme(t: ThemeValue) {
  const root = document.documentElement;
  if (t === "dark") {
    root.classList.add("dark");
  } else if (t === "light") {
    root.classList.remove("dark");
  } else {
    // system
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  }
  localStorage.setItem("theme", t);
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-secondary/30">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  );
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start">
      <div className="sm:pt-2">
        <p className="text-xs font-medium text-foreground">{label}</p>
        {hint && <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{hint}</p>}
      </div>
      <div className="sm:col-span-2">{children}</div>
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${checked ? "bg-accent" : "bg-muted"}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4.5" : "translate-x-0.5"}`} />
    </button>
  );
}

function SaveBar({ onSave, saving, saved }: { onSave: () => void; saving: boolean; saved: boolean }) {
  return (
    <div className="flex justify-end pt-2">
      <Button onClick={onSave} disabled={saving} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-5 text-sm font-semibold">
        {saved ? <Check className="w-4 h-4" /> : saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" /> : <Save className="w-4 h-4" />}
        {saved ? "Saved!" : saving ? "Saving…" : "Save Changes"}
      </Button>
    </div>
  );
}

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Business
  const [bizName, setBizName] = useState("HanaEats");
  const [bizEmail, setBizEmail] = useState("hello@hanaeats.com");
  const [bizPhone, setBizPhone] = useState("+60 12-345 6789");
  const [bizAddress, setBizAddress] = useState("123 Jalan Bukit Bintang, Kuala Lumpur");
  const [bizWebsite, setBizWebsite] = useState("https://hanaeats.com");
  const [bizDesc, setBizDesc] = useState("Modern restaurant management platform.");

  // Billing / Tax
  const [currency, setCurrency] = useState("MYR");
  const [taxRate, setTaxRate] = useState("6");
  const [taxLabel, setTaxLabel] = useState("SST");
  const [serviceCharge, setServiceCharge] = useState("10");
  const [receiptFooter, setReceiptFooter] = useState("Thank you for dining with us!");

  // Notifications
  const [notifNewOrder, setNotifNewOrder] = useState(true);
  const [notifLowStock, setNotifLowStock] = useState(true);
  const [notifPayment, setNotifPayment] = useState(false);
  const [notifReservation, setNotifReservation] = useState(true);
  const [notifEmail, setNotifEmail] = useState(false);

  // Appearance — read saved theme on mount
  const [theme, setThemeState] = useState<ThemeValue>("light");

  useEffect(() => {
    const saved = (localStorage.getItem("theme") as ThemeValue) ?? "light";
    setThemeState(saved);
    applyTheme(saved);

    // Keep system theme in sync if selected
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if ((localStorage.getItem("theme") as ThemeValue) === "system") applyTheme("system");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  function setTheme(t: ThemeValue) {
    setThemeState(t);
    applyTheme(t);
  }

  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("Asia/Kuala_Lumpur");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");

  // Security
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [twoFactor, setTwoFactor] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState("60");

  function handleSave() {
    setSaving(true);
    setSaved(false);
    setTimeout(() => { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500); }, 1000);
  }

  const THEMES = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ] as const;

  const CURRENCIES = ["MYR", "USD", "SGD", "IDR", "THB", "PHP", "VND"];
  const LANGUAGES = [{ value: "en", label: "English" }, { value: "ms", label: "Bahasa Melayu" }, { value: "zh", label: "中文" }, { value: "id", label: "Bahasa Indonesia" }];
  const TIMEZONES = ["Asia/Kuala_Lumpur", "Asia/Singapore", "Asia/Jakarta", "Asia/Bangkok", "Asia/Manila", "UTC"];

  return (
    <div className="min-h-screen bg-background">
      {/* Page header */}
      <div className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <span>Dashboard</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">Settings</span>
        </div>
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        </div>
      </div>

      <div className="px-6 py-6 max-w-4xl mx-auto">
        <Tabs defaultValue="business">
          <TabsList className="bg-secondary/50 border border-border h-auto p-1 flex flex-wrap gap-1 mb-6">
            {[
              { value: "business", label: "Business", icon: Building2 },
              { value: "billing", label: "Billing & Tax", icon: Receipt },
              { value: "notifications", label: "Notifications", icon: Bell },
              { value: "appearance", label: "Appearance", icon: Palette },
              { value: "security", label: "Security", icon: Shield },
            ].map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm text-muted-foreground"
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Business ── */}
          <TabsContent value="business" className="space-y-4 mt-0">
            <SectionCard title="Business Profile" description="Basic information about your restaurant">
              <FieldRow label="Business Name" hint="Displayed on receipts and customer-facing pages">
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input value={bizName} onChange={e => setBizName(e.target.value)} className="pl-9 h-9 text-sm" />
                </div>
              </FieldRow>
              <Separator />
              <FieldRow label="Email Address" hint="For customer communications">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input type="email" value={bizEmail} onChange={e => setBizEmail(e.target.value)} className="pl-9 h-9 text-sm" />
                </div>
              </FieldRow>
              <Separator />
              <FieldRow label="Phone Number">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input value={bizPhone} onChange={e => setBizPhone(e.target.value)} className="pl-9 h-9 text-sm" />
                </div>
              </FieldRow>
              <Separator />
              <FieldRow label="Address">
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                  <Textarea value={bizAddress} onChange={e => setBizAddress(e.target.value)} className="pl-9 text-sm min-h-[72px] resize-none" />
                </div>
              </FieldRow>
              <Separator />
              <FieldRow label="Website">
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input value={bizWebsite} onChange={e => setBizWebsite(e.target.value)} className="pl-9 h-9 text-sm" />
                </div>
              </FieldRow>
              <Separator />
              <FieldRow label="Description" hint="Short description of your restaurant">
                <Textarea value={bizDesc} onChange={e => setBizDesc(e.target.value)} className="text-sm min-h-[72px] resize-none" />
              </FieldRow>
            </SectionCard>
            <SaveBar onSave={handleSave} saving={saving} saved={saved} />
          </TabsContent>

          {/* ── Billing & Tax ── */}
          <TabsContent value="billing" className="space-y-4 mt-0">
            <SectionCard title="Currency & Tax" description="Configure pricing, tax rates and service charges">
              <FieldRow label="Currency" hint="Used across all transactions">
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="w-full pl-9 pr-3 h-9 text-sm border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </FieldRow>
              <Separator />
              <FieldRow label="Tax Label" hint="e.g. GST, SST, VAT">
                <Input value={taxLabel} onChange={e => setTaxLabel(e.target.value)} className="h-9 text-sm" placeholder="SST" />
              </FieldRow>
              <Separator />
              <FieldRow label="Tax Rate (%)" hint="Applied to all orders">
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input type="number" min="0" max="100" step="0.1" value={taxRate} onChange={e => setTaxRate(e.target.value)} className="pl-9 h-9 text-sm" />
                </div>
              </FieldRow>
              <Separator />
              <FieldRow label="Service Charge (%)" hint="Optional service charge">
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input type="number" min="0" max="100" step="0.1" value={serviceCharge} onChange={e => setServiceCharge(e.target.value)} className="pl-9 h-9 text-sm" />
                </div>
              </FieldRow>
            </SectionCard>

            <SectionCard title="Receipt" description="Customise what appears on printed receipts">
              <FieldRow label="Footer Message" hint="Shown at the bottom of every receipt">
                <div className="relative">
                  <Printer className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                  <Textarea value={receiptFooter} onChange={e => setReceiptFooter(e.target.value)} className="pl-9 text-sm min-h-[72px] resize-none" />
                </div>
              </FieldRow>
            </SectionCard>
            <SaveBar onSave={handleSave} saving={saving} saved={saved} />
          </TabsContent>

          {/* ── Notifications ── */}
          <TabsContent value="notifications" className="space-y-4 mt-0">
            <SectionCard title="In-App Notifications" description="Choose which events trigger notifications">
              {[
                { label: "New Order", hint: "Alert when a new order is placed", value: notifNewOrder, set: setNotifNewOrder },
                { label: "Low Stock Alert", hint: "Alert when ingredient stock falls below threshold", value: notifLowStock, set: setNotifLowStock },
                { label: "Payment Received", hint: "Alert when a payment is confirmed", value: notifPayment, set: setNotifPayment },
                { label: "New Reservation", hint: "Alert when a table reservation is made", value: notifReservation, set: setNotifReservation },
              ].map(({ label, hint, value, set }, i, arr) => (
                <div key={label}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{hint}</p>
                    </div>
                    <ToggleSwitch checked={value} onChange={set} />
                  </div>
                  {i < arr.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </SectionCard>

            <SectionCard title="Email Notifications" description="Send notification summaries via email">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Daily Summary Email</p>
                  <p className="text-xs text-muted-foreground">Receive a daily digest of orders, revenue and alerts</p>
                </div>
                <ToggleSwitch checked={notifEmail} onChange={setNotifEmail} />
              </div>
              {notifEmail && (
                <>
                  <Separator />
                  <FieldRow label="Recipient Email" hint="Where to send the daily summary">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input type="email" defaultValue={bizEmail} className="pl-9 h-9 text-sm" />
                    </div>
                  </FieldRow>
                </>
              )}
            </SectionCard>
            <SaveBar onSave={handleSave} saving={saving} saved={saved} />
          </TabsContent>

          {/* ── Appearance ── */}
          <TabsContent value="appearance" className="space-y-4 mt-0">
            <SectionCard title="Theme" description="Choose how the dashboard looks">
              <div className="grid grid-cols-3 gap-3">
                {THEMES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === value ? "border-accent bg-accent/5 shadow-sm" : "border-border hover:border-muted-foreground/40"}`}
                  >
                    <Icon className={`w-5 h-5 ${theme === value ? "text-accent" : "text-muted-foreground"}`} />
                    <span className={`text-xs font-semibold ${theme === value ? "text-accent" : "text-muted-foreground"}`}>{label}</span>
                    {theme === value && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                  </button>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Localisation" description="Language, timezone and date format">
              <FieldRow label="Language">
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  className="w-full px-3 h-9 text-sm border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </FieldRow>
              <Separator />
              <FieldRow label="Timezone">
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <select
                    value={timezone}
                    onChange={e => setTimezone(e.target.value)}
                    className="w-full pl-9 pr-3 h-9 text-sm border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </FieldRow>
              <Separator />
              <FieldRow label="Date Format">
                <select
                  value={dateFormat}
                  onChange={e => setDateFormat(e.target.value)}
                  className="w-full px-3 h-9 text-sm border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"].map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </FieldRow>
            </SectionCard>
            <SaveBar onSave={handleSave} saving={saving} saved={saved} />
          </TabsContent>

          {/* ── Security ── */}
          <TabsContent value="security" className="space-y-4 mt-0">
            <SectionCard title="Change Password" description="Update your account password">
              <FieldRow label="Current Password">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    type={showPass ? "text" : "password"}
                    value={currentPass}
                    onChange={e => setCurrentPass(e.target.value)}
                    className="pl-9 pr-9 h-9 text-sm"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </FieldRow>
              <Separator />
              <FieldRow label="New Password" hint="Minimum 8 characters">
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} className="pl-9 h-9 text-sm" placeholder="••••••••" />
                </div>
              </FieldRow>
              <Separator />
              <FieldRow label="Confirm Password">
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} className="pl-9 h-9 text-sm" placeholder="••••••••" />
                </div>
                {confirmPass && newPass !== confirmPass && (
                  <p className="text-xs text-destructive mt-1">Passwords do not match</p>
                )}
              </FieldRow>
            </SectionCard>

            <SectionCard title="Access & Sessions" description="Control session behaviour and two-factor authentication">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Two-Factor Authentication</p>
                  <p className="text-xs text-muted-foreground">Add an extra layer of security to your account</p>
                </div>
                <ToggleSwitch checked={twoFactor} onChange={setTwoFactor} />
              </div>
              <Separator />
              <FieldRow label="Session Timeout" hint="Auto-logout after inactivity (minutes)">
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input type="number" min="5" max="480" value={sessionTimeout} onChange={e => setSessionTimeout(e.target.value)} className="pl-9 h-9 text-sm" />
                </div>
              </FieldRow>
            </SectionCard>

            <SectionCard title="Danger Zone" description="Irreversible actions — proceed with caution">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Sign Out All Devices</p>
                  <p className="text-xs text-muted-foreground">Revoke all active sessions across all devices</p>
                </div>
                <Button variant="outline" className="h-8 text-xs border-destructive/40 text-destructive hover:bg-destructive/5 hover:border-destructive">
                  Sign Out All
                </Button>
              </div>
            </SectionCard>

            <SaveBar onSave={handleSave} saving={saving} saved={saved} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
