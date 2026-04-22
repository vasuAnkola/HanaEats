"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import Link from "next/link";
import { UserPlus, Loader2 } from "lucide-react";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

const ROLE_BADGE: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700",
  admin: "bg-blue-100 text-blue-700",
  manager: "bg-green-100 text-green-700",
  cashier: "bg-indigo-100 text-indigo-700",
  waiter: "bg-yellow-100 text-yellow-700",
  kitchen: "bg-red-100 text-red-700",
};

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
  cashier: "Cashier",
  waiter: "Waiter",
  kitchen: "Kitchen",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [canCreate, setCanCreate] = useState(false);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        setUsers(Array.isArray(data) ? data : []);
        setLoading(false);
      });

    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => {
        if (s?.user?.role && ["super_admin", "admin"].includes(s.user.role)) {
          setCanCreate(true);
        }
      });
  }, []);

  const columns: Column<User>[] = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      render: (u) => (
        <div>
          <p className="font-medium text-gray-900">{u.name}</p>
          <p className="text-xs text-gray-400">{u.email}</p>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      sortable: true,
      render: (u) => (
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ROLE_BADGE[u.role] ?? "bg-gray-100 text-gray-600"}`}>
          {ROLE_LABEL[u.role] ?? u.role}
        </span>
      ),
    },
    {
      key: "is_active",
      label: "Status",
      render: (u) => (
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
          {u.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "last_login_at",
      label: "Last Login",
      render: (u) => (
        <span className="text-sm text-gray-500">
          {u.last_login_at
            ? new Date(u.last_login_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
            : <span className="text-gray-300">Never</span>}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "Joined",
      sortable: true,
      render: (u) => (
        <span className="text-sm text-gray-500">
          {new Date(u.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
      ),
    },
  ];

  const toolbar = canCreate ? (
    <Link href="/dashboard/users/new">
      <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 h-9">
        <UserPlus className="w-4 h-4" /> Add User
      </Button>
    </Link>
  ) : undefined;

  return (
    <div>
      <Header title="Users" subtitle={`${users.length} team members`} />
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        ) : (
          <DataTable
            data={users}
            columns={columns}
            searchKeys={["name", "email", "role"]}
            searchPlaceholder="Search users..."
            pageSize={10}
            emptyMessage="No users found."
            toolbar={toolbar}
          />
        )}
      </div>
    </div>
  );
}
