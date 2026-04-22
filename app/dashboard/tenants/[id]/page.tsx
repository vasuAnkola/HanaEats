import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { queryOne, query } from "@/lib/db";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowLeft, Pencil, Building2, Globe, Mail, Phone,
  MapPin, Store, Users, Calendar, CreditCard,
} from "lucide-react";

interface TenantDetail {
  id: number;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  address: string | null;
  plan: string;
  is_active: boolean;
  country_name: string;
  currency_code: string;
  currency_symbol: string;
  tax_name: string | null;
  tax_rate: string;
  created_at: string;
}

interface Outlet {
  id: number;
  name: string;
  outlet_type: string;
  is_active: boolean;
  phone: string | null;
  address: string | null;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
}

const ROLE_COLOR: Record<string, string> = {
  admin: "bg-blue-100 text-blue-700",
  manager: "bg-green-100 text-green-700",
  cashier: "bg-indigo-100 text-indigo-700",
  waiter: "bg-yellow-100 text-yellow-700",
  kitchen: "bg-red-100 text-red-700",
};

const PLAN_COLOR: Record<string, string> = {
  starter: "bg-gray-100 text-gray-600",
  pro: "bg-blue-100 text-blue-700",
  enterprise: "bg-purple-100 text-purple-700",
};

const TYPE_LABEL: Record<string, string> = {
  restaurant: "Restaurant", cafe: "Cafe", bakery: "Bakery",
  food_truck: "Food Truck", hawker: "Hawker / Food Court",
  qsr: "QSR", cloud_kitchen: "Cloud Kitchen",
  bar: "Bar / Lounge", tea_house: "Tea House", juice_shop: "Juice Shop",
};

type Props = { params: Promise<{ id: string }> };

export default async function TenantDetailPage({ params }: Props) {
  const session = await auth();
  if (!session || session.user.role !== "super_admin") redirect("/dashboard");

  const { id } = await params;

  const tenant = await queryOne<TenantDetail>(`
    SELECT t.*, c.name as country_name, c.currency_code, c.currency_symbol, c.tax_name, c.tax_rate
    FROM tenants t JOIN countries c ON t.country_id = c.id
    WHERE t.id = $1
  `, [id]);

  if (!tenant) notFound();

  const [outlets, users] = await Promise.all([
    query<Outlet>("SELECT id, name, outlet_type, is_active, phone, address FROM outlets WHERE tenant_id = $1 ORDER BY created_at DESC", [id]),
    query<User>("SELECT id, name, email, role, is_active, last_login_at FROM users WHERE tenant_id = $1 ORDER BY created_at DESC", [id]),
  ]);

  return (
    <div>
      <Header title={tenant.name} subtitle={`/${tenant.slug} · ${tenant.country_name}`} />
      <div className="p-6 space-y-5 max-w-4xl">
        <div className="flex items-center justify-between">
          <Link href="/dashboard/tenants" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
            <ArrowLeft className="w-4 h-4" /> Back to Tenants
          </Link>
          <Link href={`/dashboard/tenants/${id}/edit`}>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2" size="sm">
              <Pencil className="w-4 h-4" /> Edit Tenant
            </Button>
          </Link>
        </div>

        {/* Overview */}
        <Card className="border-gray-200 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" /> Business Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow icon={Globe} label="Country" value={`${tenant.country_name} (${tenant.currency_code} ${tenant.currency_symbol})`} />
              <InfoRow icon={CreditCard} label="Plan">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${PLAN_COLOR[tenant.plan]}`}>{tenant.plan}</span>
              </InfoRow>
              <InfoRow icon={Mail} label="Email" value={tenant.email} />
              {tenant.phone && <InfoRow icon={Phone} label="Phone" value={tenant.phone} />}
              {tenant.address && <InfoRow icon={MapPin} label="Address" value={tenant.address} className="col-span-2" />}
              <InfoRow icon={Globe} label="Tax" value={tenant.tax_name ? `${tenant.tax_name} ${tenant.tax_rate}%` : "None"} />
              <InfoRow icon={Calendar} label="Created" value={new Date(tenant.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} />
              <div className="col-span-2 flex items-center gap-2 pt-1">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${tenant.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                  {tenant.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Outlets */}
        <Card className="border-gray-200 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Store className="w-4 h-4 text-indigo-600" /> Outlets ({outlets.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {outlets.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No outlets yet.</p>
            ) : (
              <div className="space-y-2">
                {outlets.map((o) => (
                  <div key={o.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{o.name}</p>
                      <p className="text-xs text-gray-400">{TYPE_LABEL[o.outlet_type] ?? o.outlet_type}{o.address ? ` · ${o.address}` : ""}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${o.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {o.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users */}
        <Card className="border-gray-200 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" /> Team ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No users yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Login</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2.5 px-3 font-medium text-gray-800">{u.name}</td>
                        <td className="py-2.5 px-3 text-gray-500">{u.email}</td>
                        <td className="py-2.5 px-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${ROLE_COLOR[u.role] ?? "bg-gray-100 text-gray-600"}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-gray-400 text-xs">
                          {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Never"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon, label, value, children, className,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-2 ${className ?? ""}`}>
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        {children ?? <p className="text-sm text-gray-700">{value ?? "—"}</p>}
      </div>
    </div>
  );
}
