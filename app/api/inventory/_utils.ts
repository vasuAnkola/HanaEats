import { NextResponse } from "next/server";

interface TenantSession {
  user: {
    tenantId?: string | null;
    role?: string;
  };
}

const INVENTORY_MANAGERS = ["super_admin", "admin", "manager"];

/** Ingredients, vendors, purchase orders and recipes are a management surface —
 * cashier/waiter/kitchen can't reach it from the sidebar and shouldn't be able
 * to write to it via the API either. */
export function canManageInventory(session: TenantSession) {
  return !!session.user.role && INVENTORY_MANAGERS.includes(session.user.role);
}

export function inventoryForbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
