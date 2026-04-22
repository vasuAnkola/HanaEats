import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { z } from "zod";

const Schema = z.object({
  outlet_id: z.number().int().positive(),
  table_number: z.string().min(1).max(20),
  capacity: z.number().int().min(1).default(4),
  section_id: z.number().int().positive().nullable().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const outletId = searchParams.get("outlet_id");
  if (!outletId) return NextResponse.json({ error: "outlet_id required" }, { status: 400 });

  const tables = await query(
    `SELECT t.*, s.name as section_name
     FROM outlet_tables t
     LEFT JOIN table_sections s ON s.id = t.section_id
     WHERE t.outlet_id = $1 ORDER BY t.section_id NULLS LAST, t.table_number`,
    [outletId]
  );
  return NextResponse.json(tables);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !["super_admin", "admin", "manager"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid input" }, { status: 400 });
  }

  const { outlet_id, table_number, capacity, section_id } = parsed.data;
  const tenantId = session.user.tenantId ?? body.tenant_id;

  const table = await queryOne(
    `INSERT INTO outlet_tables (outlet_id, tenant_id, table_number, capacity, section_id)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [outlet_id, tenantId, table_number, capacity, section_id ?? null]
  );
  return NextResponse.json(table, { status: 201 });
}
