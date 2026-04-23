import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Store, Users, Globe, TrendingUp, Activity } from "lucide-react";
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
    return {
      outlets: Number(outlets[0].count),
      users: Number(users[0].count),
    };
  } catch {
    return { outlets: 0, users: 0 };
  }
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role as UserRole;

  if (role === "super_admin") {
    const stats = await getSuperAdminStats();
    return (
      <div>
        <Header />
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Building2} label="Active Tenants" value={stats.tenants} color="blue" />
            <StatCard icon={Store} label="Total Outlets" value={stats.outlets} color="green" />
            <StatCard icon={Users} label="Total Users" value={stats.users} color="orange" />
            <StatCard icon={Globe} label="Countries" value={stats.countries} color="purple" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <QuickActions role={role} />
            <RecentActivity />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard icon={Store} label="Outlets" value={stats.outlets} color="green" />
            <StatCard icon={Users} label="Team Members" value={stats.users} color="orange" />
            <StatCard icon={TrendingUp} label="Today's Orders" value={0} color="blue" />
          </div>
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
        <p className="text-gray-500">Welcome to HANAEats.</p>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: "blue" | "green" | "orange" | "purple";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-indigo-50 text-indigo-600",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <Card className="border-gray-200 shadow-none">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">{label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActions({ role }: { role: UserRole }) {
  const actions =
    role === "super_admin"
      ? [
          { label: "Add Tenant", href: "/dashboard/tenants/new", desc: "Register a new business" },
          { label: "Manage Countries", href: "/dashboard/countries", desc: "Tax rates and currencies" },
          { label: "View All Users", href: "/dashboard/users", desc: "Platform-wide user list" },
        ]
      : [
          { label: "Add Outlet", href: "/dashboard/outlets/new", desc: "Open a new branch" },
          { label: "Manage Team", href: "/dashboard/users", desc: "Invite or manage staff" },
          { label: "View Reports", href: "/dashboard/reports", desc: "Sales and performance" },
        ];

  return (
    <Card className="border-gray-200 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-gray-700">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map((a) => (
          <a
            key={a.href}
            href={a.href}
            className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-colors group"
          >
            <div>
              <p className="text-sm font-medium text-gray-800 group-hover:text-indigo-700">{a.label}</p>
              <p className="text-xs text-gray-400">{a.desc}</p>
            </div>
            <span className="text-gray-300 group-hover:text-indigo-400 text-lg">›</span>
          </a>
        ))}
      </CardContent>
    </Card>
  );
}

function RecentActivity() {
  return (
    <Card className="border-gray-200 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-400" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-400 py-4 text-center">No recent activity yet.</p>
      </CardContent>
    </Card>
  );
}
