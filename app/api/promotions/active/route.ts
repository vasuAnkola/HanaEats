import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  void req;
  const today = new Date().toISOString().split("T")[0];
  const rows = await query(
    "SELECT * FROM promotions WHERE tenant_id = $1 AND is_active = TRUE AND start_date <= $2 AND end_date >= $2 ORDER BY start_date DESC",
    [session.user.tenantId, today]
  );
  return NextResponse.json(rows);
}
