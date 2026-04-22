import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { z } from "zod";

const CreateCountrySchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().length(2).toUpperCase(),
  currency_code: z.string().length(3).toUpperCase(),
  currency_symbol: z.string().min(1).max(5),
  tax_name: z.string().optional(),
  tax_rate: z.number().min(0).max(100).default(0),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "1" && session?.user.role === "super_admin";

  const countries = await query(
    all
      ? "SELECT * FROM countries ORDER BY name"
      : "SELECT id, name, code, currency_code, currency_symbol, tax_name, tax_rate FROM countries WHERE is_active = true ORDER BY name"
  );
  return NextResponse.json(countries);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = CreateCountrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid input" }, { status: 400 });
  }

  const { name, code, currency_code, currency_symbol, tax_name, tax_rate } = parsed.data;

  const existing = await queryOne("SELECT id FROM countries WHERE code = $1", [code]);
  if (existing) return NextResponse.json({ error: "Country code already exists" }, { status: 409 });

  const country = await queryOne(
    `INSERT INTO countries (name, code, currency_code, currency_symbol, tax_name, tax_rate)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [name, code, currency_code, currency_symbol, tax_name ?? null, tax_rate]
  );

  return NextResponse.json(country, { status: 201 });
}
