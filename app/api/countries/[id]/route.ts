import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { z } from "zod";

const UpdateCountrySchema = z.object({
  tax_name: z.string().nullable().optional(),
  tax_rate: z.number().min(0).max(100).optional(),
  is_active: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = UpdateCountrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const fields = parsed.data;
  const keys = Object.keys(fields) as (keyof typeof fields)[];
  if (keys.length === 0) return NextResponse.json({ error: "No fields" }, { status: 400 });

  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const values = keys.map((k) => fields[k]);

  const country = await queryOne(
    `UPDATE countries SET ${setClauses} WHERE id = $${keys.length + 1} RETURNING *`,
    [...values, id]
  );

  if (!country) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(country);
}
