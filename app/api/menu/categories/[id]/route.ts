import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { z } from "zod";

const Schema = z.object({
  name: z.string().min(1).max(150).optional(),
  description: z.string().nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  display_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
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
  if (!parsed.success) {
    return NextResponse.json({ error: Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid input" }, { status: 400 });
  }
  const fields = parsed.data;
  const keys = Object.keys(fields) as (keyof typeof fields)[];
  if (!keys.length) return NextResponse.json({ error: "No fields" }, { status: 400 });

  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const values = keys.map((k) => fields[k]);
  const row = await queryOne(
    `UPDATE menu_categories SET ${setClauses}, updated_at = NOW() WHERE id = $${keys.length + 1} RETURNING *`,
    [...values, id]
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
  await queryOne("DELETE FROM menu_categories WHERE id = $1", [id]);
  return NextResponse.json({ success: true });
}
