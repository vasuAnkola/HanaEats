import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import type { UserRole } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";
import { WelcomeTour } from "@/components/onboarding/welcome-tour";
import { TourUserProvider } from "@/lib/tour";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  const role = session.user.role as UserRole;

  return (
    <I18nProvider>
      <TourUserProvider value={{ userId: session.user.id, role }}>
        <SidebarProvider>
          <AppSidebar
            userName={session.user.name ?? "User"}
            userEmail={session.user.email ?? ""}
            userRole={role}
          />
          <SidebarInset>
            {children}
          </SidebarInset>
        </SidebarProvider>
        <WelcomeTour userId={session.user.id} role={role} />
      </TourUserProvider>
    </I18nProvider>
  );
}
