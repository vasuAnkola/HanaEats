import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { z } from "zod";

const Schema = z.object({
  name: z.string().min(1).max(100),
  is_required: z.boolean().default(false),
  display_order: z.number().int().default(0),
  options: z.array(z.object({
    name: z.string().min(1).max(100),
    price_modifier: z.number().default(0),
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

  const { name, is_required, display_order, options } = parsed.data;
  const variant = await queryOne(
    `INSERT INTO menu_variants (item_id, name, is_required, display_order) VALUES ($1,$2,$3,$4) RETURNING *`,
    [id, name, is_required, display_order]
  ) as Record<string, unknown>;

  for (const opt of options) {
    await queryOne(
      `INSERT INTO menu_variant_options (variant_id, name, price_modifier, display_order) VALUES ($1,$2,$3,$4)`,
      [variant.id, opt.name, opt.price_modifier, opt.display_order]
    );
  }

  return NextResponse.json(variant, { status: 201 });
}
