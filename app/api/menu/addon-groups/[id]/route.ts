import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { z } from "zod";

const Schema = z.object({
  name: z.string().min(1).max(100).optional(),
  is_required: z.boolean().optional(),
  max_select: z.number().int().positive().nullable().optional(),
  display_order: z.number().int().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || !["super_admin", "admin", "manager"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const fields = parsed.data;
  const keys = Object.keys(fields) as (keyof typeof fields)[];
  if (!keys.length) return NextResponse.json({ error: "No fields" }, { status: 400 });
  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const row = await queryOne(
    `UPDATE menu_add_on_groups mag SET ${setClauses}
     FROM menu_items mi WHERE mag.item_id = mi.id
       AND mag.id = $${keys.length + 1} AND mi.tenant_id = $${keys.length + 2}
     RETURNING mag.*`,
    [...keys.map((k) => fields[k]), id, session.user.tenantId]
  );
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || !["super_admin", "admin", "manager"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await queryOne(
    `DELETE FROM menu_add_on_groups mag USING menu_items mi
     WHERE mag.item_id = mi.id AND mag.id = $1 AND mi.tenant_id = $2`,
    [id, session.user.tenantId]
  );
  return NextResponse.json({ success: true });
}
