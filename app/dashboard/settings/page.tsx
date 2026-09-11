"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n, SUPPORTED_LANGUAGES } from "@/lib/i18n";
import { Globe, User, Compass, KeyRound, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiErrorMessage, readJson } from "@/lib/api-client";
import { toast } from "sonner";

interface Account { id: number; name: string; email: string; role: string; language: string; }

export default function SettingsPage() {
  const { lang, setLang, t } = useI18n();
  const [account, setAccount] = useState<Account | null>(null);

  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    fetch("/api/account").then(readJson).then((data) => {
      const acc = data as Account | null;
      setAccount(acc);
      if (acc?.name) setName(acc.name);
    });
  }, []);

  function restartTour() {
    if (!account) return;
    try { localStorage.removeItem(`hanaeats_tour_seen_${account.id}`); } catch {}
    window.location.reload();
  }

  async function saveName() {
    if (!name.trim() || name === account?.name) return;
    setSavingName(true);
    const res = await fetch("/api/account", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const data = await readJson(res);
    setSavingName(false);
    if (!res.ok) { toast.error(apiErrorMessage(data)); return; }
    setAccount(data as Account);
    toast.success("Name updated");
  }

  async function changePassword() {
    setPwError("");
    if (newPassword.length < 8) { setPwError("New password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setPwError("New passwords don't match."); return; }

    setSavingPw(true);
    const res = await fetch("/api/account", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
    const data = await readJson(res);
    setSavingPw(false);
    if (!res.ok) { setPwError(apiErrorMessage(data)); return; }
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    toast.success("Password changed");
  }

  const canManageTeam = account && ["super_admin", "admin", "manager"].includes(account.role);

  return (
    <div>
      <Header title={t("settings")} subtitle="Account and application preferences" />
      <div className="p-6 max-w-xl space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">Account</h3>
          </div>
          {account ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="acc-name" className="text-xs font-medium text-gray-600">Name</Label>
                <div className="flex gap-2">
                  <Input id="acc-name" value={name} onChange={e => setName(e.target.value)} className="max-w-xs" />
                  <Button size="sm" variant="outline" onClick={saveName} disabled={savingName || !name.trim() || name === account.name}>
                    {savingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
                  </Button>
                </div>
              </div>
              <p className="text-sm"><span className="text-gray-400">Email:</span> <span className="text-gray-800 font-medium">{account.email}</span></p>
              <p className="text-sm"><span className="text-gray-400">Role:</span> <span className="text-gray-800 font-medium capitalize">{account.role.replace("_", " ")}</span></p>
              {canManageTeam && (
                <p className="text-xs text-gray-400">Need to reset someone else's password? Do it from <a href="/dashboard/users" className="text-blue-600 hover:underline">Team</a> — open their profile and set a new one.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Loading...</p>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <KeyRound className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">Password</h3>
          </div>
          <p className="text-xs text-gray-400 mb-4">Change the password you use to sign in.</p>
          <div className="space-y-3 max-w-xs">
            <div className="space-y-1.5">
              <Label htmlFor="pw-current" className="text-xs font-medium text-gray-600">Current password</Label>
              <Input id="pw-current" type={showPw ? "text" : "password"} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} autoComplete="current-password" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw-new" className="text-xs font-medium text-gray-600">New password</Label>
              <Input id="pw-new" type={showPw ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="new-password" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw-confirm" className="text-xs font-medium text-gray-600">Confirm new password</Label>
              <Input id="pw-confirm" type={showPw ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" />
            </div>
            <button type="button" onClick={() => setShowPw(s => !s)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600">
              {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />} {showPw ? "Hide" : "Show"} passwords
            </button>
            {pwError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{pwError}</p>}
            <Button size="sm" onClick={changePassword} disabled={savingPw || !currentPassword || !newPassword || !confirmPassword}>
              {savingPw && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />} Change password
            </Button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">{t("language")}</h3>
          </div>
          <p className="text-xs text-gray-400 mb-3">Choose the language used across the dashboard and POS.</p>
          <Select value={lang} onValueChange={(v) => v && setLang(v as typeof lang)}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map(l => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Compass className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">Product Tour</h3>
          </div>
          <p className="text-xs text-gray-400 mb-3">Replay the welcome walkthrough for your role, shown once when you first signed in.</p>
          <Button variant="outline" size="sm" onClick={restartTour} disabled={!account}>Restart tour</Button>
        </div>
      </div>
    </div>
  );
}
