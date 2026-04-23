const fs = require("fs");
const path = require("path");
const base = "d:/WORK24/hana eats/app";
function w(rel, content) {
  const fp = path.join(base, rel);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, content, "utf8");
  console.log("Written:", rel);
}

w("app/api/vouchers/validate/route.ts", `import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { code, order_amount } = body;
  if (!code) return NextResponse.json({ valid: false, reason: "No code provided" });
  const rows = await query(
    "SELECT * FROM vouchers WHERE tenant_id = $1 AND code = $2 AND is_active = TRUE",
    [session.user.tenantId, code.toUpperCase()]
  );
  if (!rows[0]) return NextResponse.json({ valid: false, reason: "Invalid or inactive voucher code" });
  const v = rows[0];
  const today = new Date().toISOString().split("T")[0];
  if (v.valid_from && today < v.valid_from) return NextResponse.json({ valid: false, reason: "Voucher not yet valid" });
  if (v.valid_until && today > v.valid_until) return NextResponse.json({ valid: false, reason: "Voucher has expired" });
  if (v.max_uses != null && parseInt(String(v.used_count)) >= parseInt(String(v.max_uses))) return NextResponse.json({ valid: false, reason: "Usage limit reached" });
  if (order_amount != null && parseFloat(String(order_amount)) < parseFloat(String(v.min_order_amount))) {
    return NextResponse.json({ valid: false, reason: "Minimum order amount is " + parseFloat(String(v.min_order_amount)).toFixed(2) });
  }
  return NextResponse.json({ valid: true, voucher: v });
}
`);

w("app/api/promotions/route.ts", `import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  void req;
  const rows = await query("SELECT * FROM promotions WHERE tenant_id = $1 ORDER BY start_date DESC", [session.user.tenantId]);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { name, discount_type, discount_value, start_date, end_date, festival_tag, applies_to } = body;
  if (!name || !discount_type || discount_value == null || !start_date || !end_date) {
    return NextResponse.json({ error: "required fields missing" }, { status: 400 });
  }
  const rows = await query(
    "INSERT INTO promotions (tenant_id, name, discount_type, discount_value, start_date, end_date, festival_tag, applies_to) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
    [session.user.tenantId, name, discount_type, parseFloat(String(discount_value)), start_date, end_date, festival_tag || null, applies_to || "all"]
  );
  return NextResponse.json(rows[0], { status: 201 });
}
`);

w("app/api/promotions/[id]/route.ts", `import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const fields: string[] = [];
  const vals: unknown[] = [];
  const allowed = ["name", "discount_type", "discount_value", "start_date", "end_date", "festival_tag", "applies_to", "is_active"];
  for (const k of allowed) {
    if (body[k] !== undefined) { vals.push(body[k]); fields.push(k + " = $" + vals.length); }
  }
  if (!fields.length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  vals.push(id, session.user.tenantId);
  const rows = await query(
    "UPDATE promotions SET " + fields.join(", ") + " WHERE id = $" + (vals.length - 1) + " AND tenant_id = $" + vals.length + " RETURNING *",
    vals
  );
  return NextResponse.json(rows[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  void req;
  await query("DELETE FROM promotions WHERE id = $1 AND tenant_id = $2", [id, session.user.tenantId]);
  return NextResponse.json({ success: true });
}
`);

w("app/api/promotions/active/route.ts", `import { NextRequest, NextResponse } from "next/server";
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
`);

w("app/api/scheduled-shifts/route.ts", `import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const outlet_id = searchParams.get("outlet_id");
  const week_start = searchParams.get("week_start");
  if (!outlet_id || !week_start) return NextResponse.json({ error: "outlet_id and week_start required" }, { status: 400 });
  const rows = await query(
    "SELECT ss.*, u.name as user_name FROM scheduled_shifts ss JOIN users u ON u.id = ss.user_id WHERE ss.tenant_id = $1 AND ss.outlet_id = $2 AND ss.shift_date >= $3::date AND ss.shift_date < ($3::date + INTERVAL '7 days') ORDER BY ss.shift_date, ss.start_time",
    [session.user.tenantId, outlet_id, week_start]
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { outlet_id, user_id, shift_date, start_time, end_time, role_label, notes } = body;
  if (!outlet_id || !user_id || !shift_date || !start_time || !end_time) {
    return NextResponse.json({ error: "required fields missing" }, { status: 400 });
  }
  const rows = await query(
    "INSERT INTO scheduled_shifts (tenant_id, outlet_id, user_id, shift_date, start_time, end_time, role_label, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
    [session.user.tenantId, outlet_id, user_id, shift_date, start_time, end_time, role_label || null, notes || null]
  );
  return NextResponse.json(rows[0], { status: 201 });
}
`);

w("app/api/scheduled-shifts/[id]/route.ts", `import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const fields: string[] = [];
  const vals: unknown[] = [];
  const allowed = ["shift_date", "start_time", "end_time", "role_label", "notes", "status"];
  for (const k of allowed) {
    if (body[k] !== undefined) { vals.push(body[k]); fields.push(k + " = $" + vals.length); }
  }
  if (!fields.length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  vals.push(id, session.user.tenantId);
  const rows = await query(
    "UPDATE scheduled_shifts SET " + fields.join(", ") + " WHERE id = $" + (vals.length - 1) + " AND tenant_id = $" + vals.length + " RETURNING *",
    vals
  );
  return NextResponse.json(rows[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  void req;
  await query("DELETE FROM scheduled_shifts WHERE id = $1 AND tenant_id = $2", [id, session.user.tenantId]);
  return NextResponse.json({ success: true });
}
`);

w("app/api/attendance/route.ts", `import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const outlet_id = searchParams.get("outlet_id");
  const user_id = searchParams.get("user_id");
  let sql = "SELECT a.*, u.name as user_name, o.name as outlet_name FROM attendance a JOIN users u ON u.id = a.user_id LEFT JOIN outlets o ON o.id = a.outlet_id WHERE a.tenant_id = $1";
  const params: unknown[] = [session.user.tenantId];
  if (outlet_id) { params.push(outlet_id); sql += " AND a.outlet_id = $" + params.length; }
  if (user_id)   { params.push(user_id);   sql += " AND a.user_id = $" + params.length; }
  sql += " ORDER BY a.clock_in DESC LIMIT 100";
  const rows = await query(sql, params);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { action, attendance_id, outlet_id, user_id } = body;
  if (action === "clock_out") {
    if (!attendance_id) return NextResponse.json({ error: "attendance_id required" }, { status: 400 });
    const rows = await query(
      "UPDATE attendance SET clock_out = NOW(), duration_minutes = EXTRACT(EPOCH FROM (NOW() - clock_in))::integer / 60 WHERE id = $1 AND tenant_id = $2 AND clock_out IS NULL RETURNING *",
      [attendance_id, session.user.tenantId]
    );
    if (!rows[0]) return NextResponse.json({ error: "Not found or already clocked out" }, { status: 400 });
    return NextResponse.json(rows[0]);
  }
  const targetUserId = user_id || session.user.id;
  if (!outlet_id) return NextResponse.json({ error: "outlet_id required" }, { status: 400 });
  const open = await query(
    "SELECT id FROM attendance WHERE user_id = $1 AND tenant_id = $2 AND clock_out IS NULL",
    [targetUserId, session.user.tenantId]
  );
  if (open.length > 0) return NextResponse.json({ error: "User already clocked in" }, { status: 400 });
  const rows = await query(
    "INSERT INTO attendance (tenant_id, user_id, outlet_id) VALUES ($1, $2, $3) RETURNING *",
    [session.user.tenantId, targetUserId, outlet_id]
  );
  return NextResponse.json(rows[0], { status: 201 });
}
`);

w("app/api/commissions/route.ts", `import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const outlet_id = searchParams.get("outlet_id");
  let sql = "SELECT c.*, u.name as user_name, o.name as outlet_name FROM commissions c JOIN users u ON u.id = c.user_id LEFT JOIN outlets o ON o.id = c.outlet_id WHERE c.tenant_id = $1";
  const params: unknown[] = [session.user.tenantId];
  if (outlet_id) { params.push(outlet_id); sql += " AND c.outlet_id = $" + params.length; }
  sql += " ORDER BY c.created_at DESC";
  const rows = await query(sql, params);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { outlet_id, user_id, period_start, period_end, commission_rate } = body;
  if (!outlet_id || !user_id || !period_start || !period_end || commission_rate == null) {
    return NextResponse.json({ error: "required fields missing" }, { status: 400 });
  }
  const salesRes = await query(
    "SELECT COALESCE(SUM(p.total_amount), 0) as total_sales, COUNT(p.id) as order_count FROM payments p WHERE p.tenant_id = $1 AND p.outlet_id = $2 AND p.created_by = $3 AND p.status = 'completed' AND p.created_at::date >= $4 AND p.created_at::date <= $5",
    [session.user.tenantId, outlet_id, user_id, period_start, period_end]
  );
  const totalSales = parseFloat(String(salesRes[0]?.total_sales || 0));
  const orderCount = parseInt(String(salesRes[0]?.order_count || 0));
  const rate = parseFloat(String(commission_rate));
  const commissionAmount = totalSales * rate / 100;
  const rows = await query(
    "INSERT INTO commissions (tenant_id, user_id, outlet_id, period_start, period_end, total_sales, commission_rate, commission_amount, order_count) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *",
    [session.user.tenantId, user_id, outlet_id, period_start, period_end, totalSales, rate, commissionAmount, orderCount]
  );
  return NextResponse.json(rows[0], { status: 201 });
}
`);

w("app/api/commissions/[id]/route.ts", `import { NextRequest, NextResponse } from "next/server";
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
`);

console.log("All API routes written!");
