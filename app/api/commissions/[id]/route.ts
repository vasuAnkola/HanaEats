import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const fields: string[] = [];
  const vals: unknown[] = [];
  if (body.status !== undefined) { vals.push(body.status); fields.push("status = $" + vals.length); }
  if (body.notes !== undefined)  { vals.push(body.notes);  fields.push("notes = $" + vals.length); }
  if (!fields.length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  vals.push(id, session.user.tenantId);
  const rows = await query(
    "UPDATE commissions SET " + fields.join(", ") + " WHERE id = $" + (vals.length - 1) + " AND tenant_id = $" + vals.length + " RETURNING *",
    vals
  );
  return NextResponse.json(rows[0]);
}
