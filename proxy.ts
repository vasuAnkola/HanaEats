import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Optimistic check: NextAuth v5 sets this cookie when a session exists
  const sessionCookie =
    req.cookies.get("authjs.session-token")?.value ??
    req.cookies.get("__Secure-authjs.session-token")?.value;

  const hasSession = Boolean(sessionCookie);

  if (!hasSession && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (hasSession && (pathname === "/login" || pathname === "/")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
