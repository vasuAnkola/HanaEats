import { DefaultSession } from "next-auth";
import { UserRole } from "@/lib/auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      tenantId: string | null;
      outletId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    tenantId: string | null;
    outletId: string | null;
  }
}
