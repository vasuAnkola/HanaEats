"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n, SUPPORTED_LANGUAGES } from "@/lib/i18n";
import { Globe, User } from "lucide-react";

interface Account { id: number; name: string; email: string; role: string; language: string; }

export default function SettingsPage() {
  const { lang, setLang, t } = useI18n();
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    fetch("/api/account").then(r => r.ok ? r.json() : null).then(setAccount);
  }, []);

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
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-400">Name:</span> <span className="text-gray-800 font-medium">{account.name}</span></p>
              <p><span className="text-gray-400">Email:</span> <span className="text-gray-800 font-medium">{account.email}</span></p>
              <p><span className="text-gray-400">Role:</span> <span className="text-gray-800 font-medium capitalize">{account.role.replace("_", " ")}</span></p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Loading...</p>
          )}
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
      </div>
    </div>
  );
}
