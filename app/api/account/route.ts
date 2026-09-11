import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryOne } from "@/lib/db";

const SUPPORTED_LANGUAGES = ["en", "th", "ms", "id", "vi", "tl"];

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await queryOne(
    `SELECT id, name, email, role, language FROM users WHERE id = $1`,
    [session.user.id]
  );
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { language } = body;
  if (language && !SUPPORTED_LANGUAGES.includes(language)) {
    return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
  }

  const user = await queryOne(
    `UPDATE users SET language = COALESCE($1, language) WHERE id = $2 RETURNING id, name, email, role, language`,
    [language ?? null, session.user.id]
  );
  return NextResponse.json(user);
}
