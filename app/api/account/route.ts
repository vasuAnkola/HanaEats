import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import bcrypt from "bcryptjs";
import { logAudit, getClientIp } from "@/lib/audit";

const SUPPORTED_LANGUAGES = ["en", "th", "ms", "id", "vi", "tl"];

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await queryOne(
    `SELECT id, name, email, role, language, (welcome_tour_seen_at IS NOT NULL) AS has_seen_welcome_tour FROM users WHERE id = $1`,
    [session.user.id]
  );
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { language, name, current_password, new_password, welcome_tour_seen } = body;

  if (welcome_tour_seen !== undefined) {
    const user = await queryOne(
      `UPDATE users SET welcome_tour_seen_at = $1 WHERE id = $2 RETURNING id, (welcome_tour_seen_at IS NOT NULL) AS has_seen_welcome_tour`,
      [welcome_tour_seen ? new Date().toISOString() : null, session.user.id]
    );
    return NextResponse.json(user);
  }

  if (language && !SUPPORTED_LANGUAGES.includes(language)) {
    return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
  }
  if (name !== undefined && !String(name).trim()) {
    return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
  }

  let newPasswordHash: string | null = null;
  if (new_password) {
    if (!current_password) {
      return NextResponse.json({ error: "Current password is required" }, { status: 400 });
    }
    if (String(new_password).length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }
    const existing = await queryOne<{ password_hash: string }>(
      `SELECT password_hash FROM users WHERE id = $1`,
      [session.user.id]
    );
    const matches = existing && await bcrypt.compare(current_password, existing.password_hash);
    if (!matches) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }
    newPasswordHash = await bcrypt.hash(new_password, 10);
  }

  const user = await queryOne(
    `UPDATE users SET
       language = COALESCE($1, language),
       name = COALESCE($2, name),
       password_hash = COALESCE($3, password_hash)
     WHERE id = $4
     RETURNING id, name, email, role, language`,
    [language ?? null, name?.trim() ?? null, newPasswordHash, session.user.id]
  );

  if (newPasswordHash) {
    logAudit({
      userId: session.user.id, tenantId: session.user.tenantId, action: "account.change_password",
      entity: "user", entityId: session.user.id, ip: getClientIp(req),
    });
  }

  return NextResponse.json(user);
}
