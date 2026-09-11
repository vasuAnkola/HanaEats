import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";

// Public — a guest looking up a business to book a table with, no login.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const tenant = await queryOne<{ id: number; name: string; slug: string }>(
    `SELECT id, name, slug FROM tenants WHERE slug = $1`,
    [slug]
  );
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const outlets = await query(
    `SELECT id, name, address, outlet_type FROM outlets WHERE tenant_id = $1 AND is_active = true ORDER BY name`,
    [tenant.id]
  );

  return NextResponse.json({ tenant: { name: tenant.name, slug: tenant.slug }, outlets });
}
