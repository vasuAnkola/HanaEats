import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { z } from "zod";

// Public — a guest books a table with no login. Staff still confirm/seat it
// from the normal (authenticated) Reservations screen.
const Schema = z.object({
  outlet_id: z.union([z.number(), z.string()]).transform(v => parseInt(String(v))),
  customer_name: z.string().min(1).max(200),
  customer_email: z.string().email().optional().or(z.literal("")),
  customer_phone: z.string().max(50).optional(),
  party_size: z.union([z.number(), z.string()]).transform(v => parseInt(String(v))).refine(n => n > 0 && n <= 50, "Party size must be between 1 and 50"),
  reservation_date: z.string().min(1),
  reservation_time: z.string().min(1),
  special_requests: z.string().max(500).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const tenant = await queryOne<{ id: number }>(`SELECT id FROM tenants WHERE slug = $1`, [slug]);
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid input" }, { status: 400 });
  }
  const { outlet_id, customer_name, customer_email, customer_phone, party_size, reservation_date, reservation_time, special_requests } = parsed.data;

  const outlet = await queryOne<{ id: number }>(
    `SELECT id FROM outlets WHERE id = $1 AND tenant_id = $2 AND is_active = true`,
    [outlet_id, tenant.id]
  );
  if (!outlet) return NextResponse.json({ error: "That outlet isn't available for booking" }, { status: 400 });

  const requestedDate = new Date(`${reservation_date}T${reservation_time}`);
  if (Number.isNaN(requestedDate.getTime()) || requestedDate < new Date(Date.now() - 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Pick a date and time in the future" }, { status: 400 });
  }

  const reservationNumber = `RSV-${Date.now().toString().slice(-8)}`;
  const row = await queryOne(
    `INSERT INTO reservations
       (tenant_id, outlet_id, reservation_number, customer_name, customer_email, customer_phone,
        party_size, reservation_date, reservation_time, special_requests, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending')
     RETURNING id, reservation_number, reservation_date, reservation_time, party_size, status`,
    [
      tenant.id, outlet_id, reservationNumber, customer_name, customer_email || null, customer_phone || null,
      party_size, reservation_date, reservation_time, special_requests || null,
    ]
  );

  return NextResponse.json(row, { status: 201 });
}
