import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import type { UserRole } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        userName={session.user.name ?? "User"}
        userEmail={session.user.email ?? ""}
        userRole={session.user.role as UserRole}
      />
      <div className="flex-1 flex flex-col min-w-0 ml-60">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
