import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const session = await queryOne<{
    table_number: string;
    outlet_name: string;
    tenant_id: number;
    outlet_id: number;
    table_id: number;
  }>(
    `SELECT ot.table_number, o.name as outlet_name, qs.tenant_id, qs.outlet_id, qs.table_id
     FROM qr_sessions qs
     JOIN outlet_tables ot ON ot.id = qs.table_id
     JOIN outlets o ON o.id = qs.outlet_id
     WHERE qs.token = $1 AND qs.is_active = true AND qs.expires_at > NOW()`,
    [token]
  );

  if (!session) {
    return NextResponse.json({ valid: false });
  }

  return NextResponse.json({
    valid: true,
    table_number: session.table_number,
    outlet_name: session.outlet_name,
    tenant_id: session.tenant_id,
    outlet_id: session.outlet_id,
    table_id: session.table_id,
  });
}
