import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { queryOne } from "@/lib/db";

export type UserRole = "super_admin" | "admin" | "manager" | "cashier" | "waiter" | "kitchen";

interface DbUser {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  tenant_id: number | null;
  outlet_id: number | null;
  is_active: boolean;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        let user: DbUser | null;
        try {
          user = await queryOne<DbUser>(
            "SELECT * FROM users WHERE email = $1 AND is_active = true",
            [credentials.email]
          );
        } catch (err) {
          console.error("[auth] DB query failed:", err);
          return null;
        }

        if (!user) return null;

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password_hash
        );
        if (!passwordMatch) return null;

        queryOne(
          "UPDATE users SET last_login_at = NOW() WHERE id = $1",
          [user.id]
        ).catch(() => {});

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenant_id ? String(user.tenant_id) : null,
          outletId: user.outlet_id ? String(user.outlet_id) : null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: UserRole }).role;
        token.tenantId = (user as { tenantId: string | null }).tenantId;
        token.outletId = (user as { outletId: string | null }).outletId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub!;
      session.user.role = token.role as UserRole;
      session.user.tenantId = token.tenantId as string | null;
      session.user.outletId = token.outletId as string | null;
      return session;
    },
  },
});
