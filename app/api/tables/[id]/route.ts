import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { z } from "zod";

const Schema = z.object({
  table_number: z.string().min(1).max(20).optional(),
  capacity: z.number().int().min(1).optional(),
  status: z.enum(["available", "occupied", "reserved", "cleaning"]).optional(),
  section_id: z.number().int().positive().nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const fields = parsed.data;
  const keys = Object.keys(fields) as (keyof typeof fields)[];
  if (!keys.length) return NextResponse.json({ error: "No fields" }, { status: 400 });

  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const row = await queryOne(
    `UPDATE outlet_tables SET ${setClauses} WHERE id = $${keys.length + 1} RETURNING *`,
    [...keys.map((k) => fields[k]), id]
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
  await queryOne("DELETE FROM outlet_tables WHERE id = $1", [id]);
  return NextResponse.json({ success: true });
}
