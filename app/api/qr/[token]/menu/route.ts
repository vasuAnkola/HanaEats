import { NextRequest, NextResponse } from "next/server";
import { queryOne, query } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const qrSession = await queryOne<{ tenant_id: number }>(
    "SELECT tenant_id FROM qr_sessions WHERE token = $1 AND is_active = true AND expires_at > NOW()",
    [token]
  );

  if (!qrSession) {
    return NextResponse.json({ error: "Invalid or expired QR code" }, { status: 403 });
  }

  const categories = await query<{ id: number; name: string }>(
    "SELECT id, name FROM menu_categories WHERE tenant_id = $1 ORDER BY sort_order, name",
    [qrSession.tenant_id]
  );

  const items = await query<{
    id: number;
    category_id: number;
    name: string;
    description: string | null;
    price: string;
    image_url: string | null;
  }>(
    `SELECT id, category_id, name, description, price, image_url
     FROM menu_items
     WHERE tenant_id = $1 AND is_available = true
     ORDER BY category_id, sort_order, name`,
    [qrSession.tenant_id]
  );

  const result = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    items: items
      .filter((i) => i.category_id === cat.id)
      .map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description,
        price: parseFloat(String(i.price)),
        image_url: i.image_url,
      })),
  })).filter((cat) => cat.items.length > 0);

  return NextResponse.json(result);
}
