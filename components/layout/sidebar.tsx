"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { getNavGroups } from "./nav-items";
import type { UserRole } from "@/lib/auth";
import { LogOut, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const ROLE_LABEL: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
  cashier: "Cashier",
  waiter: "Waiter",
  kitchen: "Kitchen",
};

const ROLE_COLOR: Record<UserRole, string> = {
  super_admin: "bg-violet-500/20 text-violet-300",
  admin: "bg-blue-500/20 text-blue-300",
  manager: "bg-emerald-500/20 text-emerald-300",
  cashier: "bg-amber-500/20 text-amber-300",
  waiter: "bg-sky-500/20 text-sky-300",
  kitchen: "bg-rose-500/20 text-rose-300",
};

interface SidebarProps {
  userName: string;
  userEmail: string;
  userRole: UserRole;
}

export function Sidebar({ userName, userEmail, userRole }: SidebarProps) {
  const pathname = usePathname();
  const groups = getNavGroups(userRole);

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-[#1a1f35] border-r border-white/5 flex flex-col z-40">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/5 flex-shrink-0">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/30">
          <span className="text-white font-bold text-sm">H</span>
        </div>
        <div>
          <p className="font-semibold text-white text-sm leading-tight">HANAEats</p>
          <p className="text-xs text-slate-400">SEA POS Platform</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {groups.map((group) => (
          <div key={group.title} className="mb-5">
            <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors",
                        active
                          ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/20"
                          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                      )}
                    >
                      <item.icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-indigo-400" : "text-slate-500")} />
                      {item.label}
                      {active && <ChevronRight className="w-3 h-3 ml-auto text-indigo-500" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/5 p-3 flex-shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarFallback className="bg-indigo-500/20 text-indigo-300 text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{userName}</p>
            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", ROLE_COLOR[userRole])}>
              {ROLE_LABEL[userRole]}
            </span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-slate-500 hover:text-rose-400 transition-colors p-1 rounded"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
