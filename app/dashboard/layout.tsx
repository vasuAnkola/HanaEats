import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import type { UserRole } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <SidebarProvider>
      <AppSidebar
        userName={session.user.name ?? "User"}
        userEmail={session.user.email ?? ""}
        userRole={session.user.role as UserRole}
      />
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
