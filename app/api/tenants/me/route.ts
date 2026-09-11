import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryOne } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session || !session.user.tenantId) return NextResponse.json({ error: "No tenant" }, { status: 404 });

  const tenant = await queryOne(
    `SELECT id, name, slug FROM tenants WHERE id = $1`,
    [session.user.tenantId]
  );
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(tenant);
}
