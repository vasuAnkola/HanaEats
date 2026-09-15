import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { queryOne } from "@/lib/db";
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

  // Server-side truth for "has this account dismissed the welcome tour" — not
  // localStorage, which resets on a cleared browser/different device and made
  // the tour reappear for accounts that had already seen it.
  const tourRow = await queryOne<{ has_seen_welcome_tour: boolean }>(
    `SELECT (welcome_tour_seen_at IS NOT NULL) AS has_seen_welcome_tour FROM users WHERE id = $1`,
    [session.user.id]
  );
  const hasSeenTour = tourRow?.has_seen_welcome_tour ?? false;

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
        <WelcomeTour userId={session.user.id} role={role} hasSeenTour={hasSeenTour} />
      </TourUserProvider>
    </I18nProvider>
  );
}
