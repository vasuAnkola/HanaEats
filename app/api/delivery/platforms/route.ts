import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import crypto from "crypto";
import { z } from "zod";

const Schema = z.object({
  outlet_id: z.union([z.number(), z.string()]).transform(v => parseInt(String(v))),
  platform: z.enum(["grabfood", "foodpanda", "gofood"]),
  api_key: z.string().optional(),
  commission_pct: z.union([z.number(), z.string()]).transform(v => parseFloat(String(v))).default(0),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const outletId = searchParams.get("outlet_id");
  if (!outletId) return NextResponse.json({ error: "outlet_id required" }, { status: 400 });

  const rows = await query(
    `SELECT * FROM delivery_platforms WHERE outlet_id = $1 AND tenant_id = $2 ORDER BY platform`,
    [outletId, session.user.tenantId]
  );
  return NextResponse.json(rows);
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
  const { outlet_id, platform, api_key, commission_pct } = parsed.data;
  const tenantId = session.user.tenantId;
  const webhookToken = crypto.randomBytes(24).toString("hex");

  try {
    const row = await queryOne(
      `INSERT INTO delivery_platforms (tenant_id, outlet_id, platform, api_key, commission_pct, webhook_token)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [tenantId, outlet_id, platform, api_key || null, commission_pct, webhookToken]
    );
    return NextResponse.json(row, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed";
    if (msg.includes("duplicate")) {
      return NextResponse.json({ error: "This platform is already configured for this outlet" }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
