import { NextResponse } from "next/server";

interface TenantSession {
  user: {
    tenantId?: string | null;
  };
}

export function getTenantId(
  session: TenantSession,
  body?: Record<string, unknown> | null,
  searchParams?: URLSearchParams
) {
  const tenantId = session.user.tenantId ?? body?.tenant_id ?? searchParams?.get("tenant_id");
  return tenantId ? String(tenantId) : null;
}

export function tenantRequired() {
  return NextResponse.json({ error: "tenant_id required" }, { status: 400 });
}

export function apiError(error: unknown, scope: string) {
  console.error(`[inventory:${scope}]`, error);

  const message = error instanceof Error && process.env.NODE_ENV !== "production"
    ? error.message
    : "Internal server error";

  return NextResponse.json({ error: message }, { status: 500 });
}
