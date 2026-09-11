import { query } from "@/lib/db";

interface AuditEntry {
  userId: string | number | null;
  tenantId: string | number | null;
  action: string;
  entity?: string;
  entityId?: string | number | null;
  details?: Record<string, unknown>;
  ip?: string | null;
}

/** Works for both the App Router's NextRequest and the plain Request NextAuth's authorize() receives. */
export function getClientIp(req?: Request): string | null {
  if (!req) return null;
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

// Fire-and-forget — an audit write failing must never break the action it's recording.
export function logAudit(entry: AuditEntry) {
  query(
    `INSERT INTO audit_logs (user_id, tenant_id, action, entity, entity_id, details, ip_address)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      entry.userId ?? null,
      entry.tenantId ?? null,
      entry.action,
      entry.entity ?? null,
      entry.entityId ?? null,
      entry.details ? JSON.stringify(entry.details) : null,
      entry.ip ?? null,
    ]
  ).catch(err => console.error("[audit] failed to log", entry.action, err));
}
