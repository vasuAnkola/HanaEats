import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { z } from "zod";

const Schema = z.object({
  name: z.string().min(1).max(100),
  is_required: z.boolean().default(false),
  max_select: z.number().int().positive().nullable().optional(),
  display_order: z.number().int().default(0),
  add_ons: z.array(z.object({
    name: z.string().min(1).max(100),
    price: z.number().min(0).default(0),
    display_order: z.number().int().default(0),
  })).default([]),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
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

  const { name, is_required, max_select, display_order, add_ons } = parsed.data;
  const group = await queryOne(
    `INSERT INTO menu_add_on_groups (item_id, name, is_required, max_select, display_order) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [id, name, is_required, max_select ?? null, display_order]
  ) as Record<string, unknown>;

  for (const addon of add_ons) {
    await queryOne(
      `INSERT INTO menu_add_ons (group_id, name, price, display_order) VALUES ($1,$2,$3,$4)`,
      [group.id, addon.name, addon.price, addon.display_order]
    );
  }

  return NextResponse.json(group, { status: 201 });
}
