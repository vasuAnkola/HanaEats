"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppBreadcrumb } from "@/components/layout/breadcrumb";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="h-14 border-b border-gray-100 bg-white flex items-center justify-between px-3 sm:px-4 flex-shrink-0 sticky top-0 z-10">
      <div className="flex items-center gap-2 min-w-0">
        <SidebarTrigger className="text-gray-400 hover:text-gray-600 flex-shrink-0" />
        <Separator orientation="vertical" className="h-4 mx-0.5 flex-shrink-0" />
        {title ? (
          <div className="flex flex-col min-w-0">
            <h1 className="text-sm font-medium text-gray-900 truncate">{title}</h1>
            {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
          </div>
        ) : (
          <AppBreadcrumb />
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {actions}
        <Button variant="ghost" size="icon" className="w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <Bell className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
