"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { getNavGroups } from "./nav-items";
import type { UserRole } from "@/lib/auth";
import { LogOut, ChevronsUpDown, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const ROLE_LABEL: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
  cashier: "Cashier",
  waiter: "Waiter",
  kitchen: "Kitchen",
};

const ROLE_COLOR: Record<UserRole, string> = {
  super_admin: "bg-[#5C432B]/10 text-[#5C432B]",
  admin: "bg-[#5C432B]/15 text-[#5C432B]",
  manager: "bg-[#5C432B]/12 text-[#5C432B]",
  cashier: "bg-[#5C432B]/18 text-[#5C432B]",
  waiter: "bg-[#5C432B]/14 text-[#5C432B]",
  kitchen: "bg-[#5C432B]/16 text-[#5C432B]",
};

interface AppSidebarProps {
  userName: string;
  userEmail: string;
  userRole: UserRole;
}

export function AppSidebar({ userName, userEmail, userRole }: AppSidebarProps) {
  const pathname = usePathname();
  const groups = getNavGroups(userRole);

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Sidebar collapsible="icon">
      {/* Logo only — no text */}
      <SidebarHeader className="border-b border-sidebar-border flex items-center justify-center py-3 px-2">
        <Link href="/dashboard" className="flex items-center justify-center">
          <div className=" flex items-center justify-center overflow-hidden  shadow-sm">
            <Image
              src="/mainlogo2.png"
              alt="HANAEats"
              width={140}
              height={20}
              className="w-full h-full object-contain"
            />
          </div>
        </Link>
      </SidebarHeader>

      {/* Nav groups */}
      <SidebarContent>
        {groups.map((group, i) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));

                  if (item.children && item.children.length > 0) {
                    const hasActiveChild = item.children.some(
                      (child) => pathname === child.href || pathname.startsWith(child.href)
                    );
                    const isOpen = active || hasActiveChild;

                    return (
                      <Collapsible key={item.href} defaultOpen={isOpen} className="group/collapsible">
                        <SidebarMenuItem>
                          <CollapsibleTrigger
                            render={
                              <SidebarMenuButton
                                tooltip={item.label}
                                className={cn(
                                  "rounded-lg font-medium transition-colors",
                                  isOpen
                                    ? "bg-sidebar-accent !text-white hover:bg-sidebar-accent hover:!text-white"
                                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
                                )}
                              />
                            }
                          >
                            <item.icon className={cn("w-4 h-4", isOpen ? "!text-white" : "text-sidebar-foreground/50")} />
                            <span>{item.label}</span>
                            <ChevronDown className="ml-auto w-3.5 h-3.5 transition-transform group-data-open/collapsible:rotate-180" />
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {item.children.map((child) => {
                                const childActive = pathname === child.href || pathname.startsWith(child.href);
                                return (
                                  <SidebarMenuSubItem key={child.href}>
                                    <SidebarMenuSubButton
                                      render={<Link href={child.href} />}
                                      isActive={childActive}
                                      className={cn(childActive && "bg-sidebar-accent !text-white font-medium")}
                                    >
                                      <child.icon className="w-4 h-4" />
                                      <span>{child.label}</span>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                );
                              })}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    );
                  }

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={active}
                        tooltip={item.label}
                        className={cn(
                          "rounded-lg font-medium transition-colors",
                          active
                            ? "bg-sidebar-accent !text-white hover:bg-sidebar-accent hover:!text-white"
                            : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
                        )}
                      >
                        <item.icon className={cn("w-4 h-4", active ? "!text-white" : "text-sidebar-foreground/50")} />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
            {i < groups.length - 1 && <SidebarSeparator className="mt-2" />}
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* User footer with sign out */}
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg group-data-[collapsible=icon]:justify-center" />
            }
          >
            <Avatar className="w-7 h-7 flex-shrink-0">
              <AvatarFallback className="bg-sidebar-accent text-white text-[10px] font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 text-left group-data-[collapsible=icon]:hidden">
              <p className="text-xs font-semibold text-sidebar-foreground truncate leading-tight">{userName}</p>
              <p className="text-[10px] text-sidebar-foreground/50 truncate">{userEmail}</p>
            </div>
            <ChevronsUpDown className="w-3.5 h-3.5 text-sidebar-foreground/40 flex-shrink-0 group-data-[collapsible=icon]:hidden" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52 mb-1">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-foreground">{userName}</p>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
                <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full w-fit mt-0.5", ROLE_COLOR[userRole])}>
                  {ROLE_LABEL[userRole]}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Always-visible sign out button */}
        <Button
          onClick={() => signOut({ callbackUrl: "/login" })}
          variant="ghost"
          className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 group-data-[collapsible=icon]:justify-center"
          title="Sign out"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span className="text-xs font-medium group-data-[collapsible=icon]:hidden">Sign out</span>
        </Button>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
