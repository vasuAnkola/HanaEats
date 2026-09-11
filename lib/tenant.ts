import { queryOne } from "@/lib/db";

/** The IANA timezone of a tenant's own country — the correct reference point for "today" in any business-rule check (voucher/promotion validity, report defaults), regardless of where the app server or a viewer's browser happens to be. */
export async function getTenantTimezone(tenantId: string | number | null | undefined): Promise<string> {
  if (!tenantId) return "Asia/Singapore";
  const row = await queryOne<{ timezone: string | null }>(
    `SELECT c.timezone FROM tenants t JOIN countries c ON c.id = t.country_id WHERE t.id = $1`,
    [tenantId]
  );
  return row?.timezone ?? "Asia/Singapore";
}
