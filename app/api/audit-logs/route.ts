import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !["super_admin", "admin", "manager"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 500);

  const params: unknown[] = [];
  const where: string[] = [];

  if (session.user.role === "super_admin") {
    const tenantId = searchParams.get("tenant_id");
    if (tenantId) { params.push(tenantId); where.push(`a.tenant_id = $${params.length}`); }
  } else {
    params.push(session.user.tenantId);
    where.push(`a.tenant_id = $${params.length}`);
  }

  if (action && action !== "all") {
    params.push(action);
    where.push(`a.action = $${params.length}`);
  }

  params.push(limit);

  const rows = await query(
    `SELECT a.id, a.action, a.entity, a.entity_id, a.details, a.ip_address, a.created_at,
            u.name AS user_name, u.email AS user_email, t.name AS tenant_name
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.user_id
     LEFT JOIN tenants t ON t.id = a.tenant_id
     ${where.length ? "WHERE " + where.join(" AND ") : ""}
     ORDER BY a.created_at DESC
     LIMIT $${params.length}`,
    params
  );
  return NextResponse.json(rows);
}
