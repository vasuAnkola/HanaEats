import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { Header } from "@/components/layout/header";
import {
  Building2, Store, Users, Globe, TrendingUp, Activity,
  ArrowRight, ShoppingCart, BarChart3, UserPlus, MapPin, Settings,
} from "lucide-react";
import type { UserRole } from "@/lib/auth";

async function getSuperAdminStats() {
  try {
    const [tenants, outlets, users, countries] = await Promise.all([
      query<{ count: string }>("SELECT COUNT(*) as count FROM tenants WHERE is_active = true"),
      query<{ count: string }>("SELECT COUNT(*) as count FROM outlets WHERE is_active = true"),
      query<{ count: string }>("SELECT COUNT(*) as count FROM users WHERE is_active = true AND role != 'super_admin'"),
      query<{ count: string }>("SELECT COUNT(*) as count FROM countries WHERE is_active = true"),
    ]);
    return {
      tenants: Number(tenants[0].count),
      outlets: Number(outlets[0].count),
      users: Number(users[0].count),
      countries: Number(countries[0].count),
    };
  } catch {
    return { tenants: 0, outlets: 0, users: 0, countries: 0 };
  }
}

async function getAdminStats(tenantId: string) {
  try {
    const [outlets, users] = await Promise.all([
      query<{ count: string }>("SELECT COUNT(*) as count FROM outlets WHERE tenant_id = $1 AND is_active = true", [tenantId]),
      query<{ count: string }>("SELECT COUNT(*) as count FROM users WHERE tenant_id = $1 AND is_active = true", [tenantId]),
    ]);
    return { outlets: Number(outlets[0].count), users: Number(users[0].count) };
  } catch {
    return { outlets: 0, users: 0 };
  }
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role as UserRole;
  const name = session.user.name ?? "there";

  if (role === "super_admin") {
    const stats = await getSuperAdminStats();
    return (
      <div>
        <Header />
        <div className="p-6 space-y-6">
          {/* Hero banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] px-8 py-7 text-white shadow-lg">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 50%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
            <p className="text-sm font-medium text-blue-200 mb-1">Welcome back,</p>
            <h1 className="text-2xl font-bold">{name} 👋</h1>
            <p className="text-blue-200 text-sm mt-1">Here's your platform overview for today.</p>
            <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
              <BarChart3 className="w-24 h-24" />
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Building2} label="Active Tenants" value={stats.tenants} color="blue" />
            <StatCard icon={Store} label="Total Outlets" value={stats.outlets} color="emerald" />
            <StatCard icon={Users} label="Total Users" value={stats.users} color="violet" />
            <StatCard icon={Globe} label="Countries" value={stats.countries} color="amber" />
          </div>

          {/* Bottom grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <QuickActions role={role} />
            <PlatformHealth stats={stats} />
          </div>
        </div>
      </div>
    );
  }

  if (role === "admin" && session.user.tenantId) {
    const stats = await getAdminStats(session.user.tenantId);
    return (
      <div>
        <Header />
        <div className="p-6 space-y-6">
          {/* Hero banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] px-8 py-7 text-white shadow-lg">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 50%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
            <p className="text-sm font-medium text-blue-200 mb-1">Welcome back,</p>
            <h1 className="text-2xl font-bold">{name} 👋</h1>
            <p className="text-blue-200 text-sm mt-1">Manage your outlets, team, and operations.</p>
            <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
              <ShoppingCart className="w-24 h-24" />
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard icon={Store} label="Active Outlets" value={stats.outlets} color="emerald" />
            <StatCard icon={Users} label="Team Members" value={stats.users} color="violet" />
            <StatCard icon={TrendingUp} label="Today's Orders" value={0} color="blue" />
          </div>

          {/* Bottom grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <QuickActions role={role} />
            <RecentActivity />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="p-6">
        <div className="rounded-2xl bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] px-8 py-7 text-white">
          <h1 className="text-xl font-bold">Welcome to HANAEats 👋</h1>
          <p className="text-blue-200 text-sm mt-1">You're logged in as {role}.</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: "blue" | "emerald" | "violet" | "amber";
}) {
  const styles = {
    blue:    { bg: "bg-blue-600",    light: "bg-blue-50 border-blue-100",    text: "text-blue-600" },
    emerald: { bg: "bg-emerald-500", light: "bg-emerald-50 border-emerald-100", text: "text-emerald-600" },
    violet:  { bg: "bg-violet-500",  light: "bg-violet-50 border-violet-100",  text: "text-violet-600" },
    amber:   { bg: "bg-amber-500",   light: "bg-amber-50 border-amber-100",   text: "text-amber-600" },
  };
  const s = styles[color];
  return (
    <div className={`bg-white border rounded-2xl p-5 shadow-sm flex items-center gap-4 ${s.light}`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5 font-medium">{label}</p>
      </div>
    </div>
  );
}

function QuickActions({ role }: { role: UserRole }) {
  const actions =
    role === "super_admin"
      ? [
          { label: "Add Tenant", href: "/dashboard/tenants/new", desc: "Register a new business", icon: Building2, color: "text-blue-500 bg-blue-50" },
          { label: "Manage Countries", href: "/dashboard/countries", desc: "Tax rates and currencies", icon: Globe, color: "text-violet-500 bg-violet-50" },
          { label: "View All Users", href: "/dashboard/users", desc: "Platform-wide user list", icon: Users, color: "text-emerald-500 bg-emerald-50" },
        ]
      : [
          { label: "Add Outlet", href: "/dashboard/outlets/new", desc: "Open a new branch", icon: MapPin, color: "text-blue-500 bg-blue-50" },
          { label: "Manage Team", href: "/dashboard/users", desc: "Invite or manage staff", icon: UserPlus, color: "text-emerald-500 bg-emerald-50" },
          { label: "View Reports", href: "/dashboard/reports", desc: "Sales and performance", icon: BarChart3, color: "text-violet-500 bg-violet-50" },
          { label: "Settings", href: "/dashboard/settings", desc: "Configure your account", icon: Settings, color: "text-amber-500 bg-amber-50" },
        ];

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-800">Quick Actions</p>
        <p className="text-xs text-gray-400 mt-0.5">Jump to common tasks</p>
      </div>
      <div className="p-3 space-y-1">
        {actions.map((a) => (
          <a
            key={a.href}
            href={a.href}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 transition-colors group"
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${a.color}`}>
              <a.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 group-hover:text-blue-700">{a.label}</p>
              <p className="text-xs text-gray-400">{a.desc}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors flex-shrink-0" />
          </a>
        ))}
      </div>
    </div>
  );
}

function PlatformHealth({ stats }: { stats: { tenants: number; outlets: number; users: number; countries: number } }) {
  const items = [
    { label: "Avg outlets per tenant", value: stats.tenants > 0 ? (stats.outlets / stats.tenants).toFixed(1) : "—", color: "bg-blue-500" },
    { label: "Avg users per tenant", value: stats.tenants > 0 ? (stats.users / stats.tenants).toFixed(1) : "—", color: "bg-violet-500" },
    { label: "Active countries", value: stats.countries, color: "bg-amber-500" },
  ];
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <Activity className="w-4 h-4 text-blue-500" />
        <div>
          <p className="text-sm font-semibold text-gray-800">Platform Health</p>
          <p className="text-xs text-gray-400 mt-0.5">Key metrics at a glance</p>
        </div>
      </div>
      <div className="p-5 space-y-4">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className={`w-2 h-2 rounded-full ${item.color}`} />
              <span className="text-sm text-gray-600">{item.label}</span>
            </div>
            <span className="text-sm font-bold text-gray-900">{item.value}</span>
          </div>
        ))}
        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500">Platform utilisation</span>
            <span className="text-xs font-semibold text-blue-600">{stats.tenants > 0 ? Math.min(100, Math.round((stats.outlets / (stats.tenants * 5)) * 100)) : 0}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full">
            <div
              className="h-2 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all"
              style={{ width: `${stats.tenants > 0 ? Math.min(100, Math.round((stats.outlets / (stats.tenants * 5)) * 100)) : 0}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function RecentActivity() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <Activity className="w-4 h-4 text-blue-500" />
        <div>
          <p className="text-sm font-semibold text-gray-800">Recent Activity</p>
          <p className="text-xs text-gray-400 mt-0.5">Latest updates</p>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center py-12 text-center px-6">
        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
          <Activity className="w-5 h-5 text-blue-300" />
        </div>
        <p className="text-sm font-medium text-gray-500">No recent activity</p>
        <p className="text-xs text-gray-400 mt-1">Activity will appear here as your team works.</p>
      </div>
    </div>
  );
}
