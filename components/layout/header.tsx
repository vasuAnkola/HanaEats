"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6 flex-shrink-0">
      <div>
        <h1 className="text-base font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600">
          <Bell className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
