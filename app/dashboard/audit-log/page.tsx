"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type Column } from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { ShieldCheck, LogIn, LogOut, UserPlus, UserCog, Trash2, KeyRound, Store, Building2, Ban } from "lucide-react";

interface LogRow {
  id: number;
  action: string;
  entity: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
  tenant_name: string | null;
}

const ACTION_META: Record<string, { label: string; icon: typeof ShieldCheck; color: string }> = {
  "auth.login": { label: "Signed in", icon: LogIn, color: "text-emerald-600 bg-emerald-50" },
  "auth.login_failed": { label: "Failed sign-in", icon: LogOut, color: "text-red-600 bg-red-50" },
  "user.create": { label: "Invited user", icon: UserPlus, color: "text-blue-600 bg-blue-50" },
  "user.update": { label: "Updated user", icon: UserCog, color: "text-blue-600 bg-blue-50" },
  "user.reset_password": { label: "Reset password", icon: KeyRound, color: "text-amber-600 bg-amber-50" },
  "user.delete": { label: "Removed user", icon: Trash2, color: "text-red-600 bg-red-50" },
  "account.change_password": { label: "Changed own password", icon: KeyRound, color: "text-amber-600 bg-amber-50" },
  "tenant.create": { label: "Onboarded tenant", icon: Building2, color: "text-indigo-600 bg-indigo-50" },
  "outlet.create": { label: "Added outlet", icon: Store, color: "text-indigo-600 bg-indigo-50" },
  "payment.void": { label: "Voided payment", icon: Ban, color: "text-red-600 bg-red-50" },
};

const ACTION_OPTIONS = ["all", ...Object.keys(ACTION_META)];

function fmtDetails(details: Record<string, unknown> | null) {
  if (!details) return "—";
  return Object.entries(details)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k.replace(/_/g, " ")}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
    .join(" · ") || "—";
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<LogRow[] | null>(null);
  const [actionFilter, setActionFilter] = useState("all");

  const load = useCallback(async () => {
    const qs = actionFilter !== "all" ? `?action=${actionFilter}` : "";
    const res = await fetch(`/api/audit-logs${qs}`);
    const data = await res.json();
    setLogs(Array.isArray(data) ? data : []);
  }, [actionFilter]);

  useEffect(() => { load(); }, [load]);

  const columns: Column<LogRow>[] = [
    {
      key: "action", label: "Action", sortable: true,
      render: r => {
        const meta = ACTION_META[r.action] ?? { label: r.action, icon: ShieldCheck, color: "text-gray-600 bg-gray-100" };
        const Icon = meta.icon;
        return (
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center ${meta.color}`}><Icon className="w-3.5 h-3.5" /></span>
            <span className="text-sm font-medium text-gray-800">{meta.label}</span>
          </div>
        );
      },
    },
    {
      key: "user_name", label: "By", sortable: true,
      render: r => r.user_name ? (
        <div>
          <p className="text-sm text-gray-800">{r.user_name}</p>
          <p className="text-[11px] text-gray-400">{r.user_email}</p>
        </div>
      ) : <span className="text-xs text-gray-400">System / unknown</span>,
    },
    { key: "tenant_name", label: "Tenant", render: r => <span className="text-sm text-gray-600">{r.tenant_name ?? "—"}</span> },
    { key: "details", label: "Details", render: r => <span className="text-xs text-gray-500">{fmtDetails(r.details)}</span> },
    { key: "ip_address", label: "IP", render: r => <span className="text-xs font-mono text-gray-400">{r.ip_address ?? "—"}</span> },
    { key: "created_at", label: "When", sortable: true, render: r => <span className="text-xs text-gray-400 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</span> },
  ];

  return (
    <div>
      <Header title="Activity Log" subtitle="Who did what, and when" />
      <div className="p-6 space-y-4">
        <Select value={actionFilter} onValueChange={v => v && setActionFilter(v)}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ACTION_OPTIONS.map(a => (
              <SelectItem key={a} value={a}>{a === "all" ? "All actions" : ACTION_META[a]?.label ?? a}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          {logs === null ? <TableSkeleton rows={8} cols={6} /> : (
            <DataTable
              data={logs}
              columns={columns}
              searchKeys={["user_name", "user_email", "tenant_name"]}
              searchPlaceholder="Search by user or tenant..."
              pageSize={25}
              emptyMessage="No activity recorded yet."
            />
          )}
        </div>
      </div>
    </div>
  );
}
