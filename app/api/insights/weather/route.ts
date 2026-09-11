import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryOne, query } from "@/lib/db";

const RAINY_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);

function classify(temperatureC: number, weatherCode: number): "hot" | "cold" | "rainy" | "mild" {
  if (RAINY_CODES.has(weatherCode)) return "rainy";
  if (temperatureC >= 30) return "hot";
  if (temperatureC <= 22) return "cold";
  return "mild";
}

interface Coords { latitude: number; longitude: number; country_name: string; }

// Real weather from Open-Meteo (free, no API key) — used to nudge which menu
// items get suggested, via the optional weather_tag staff can set per item.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const outletId = searchParams.get("outlet_id");
  if (!outletId) return NextResponse.json({ error: "outlet_id required" }, { status: 400 });

  const coords = await queryOne<Coords>(
    `SELECT COALESCE(o.latitude, c.capital_lat) AS latitude,
            COALESCE(o.longitude, c.capital_lng) AS longitude,
            c.name AS country_name
     FROM outlets o
     JOIN tenants t ON t.id = o.tenant_id
     JOIN countries c ON c.id = t.country_id
     WHERE o.id = $1 AND o.tenant_id = $2`,
    [outletId, session.user.tenantId]
  );
  if (!coords || coords.latitude == null || coords.longitude == null) {
    return NextResponse.json({ available: false });
  }

  let weather: { temperature: number; weathercode: number } | null = null;
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current_weather=true`,
      { next: { revalidate: 600 } }
    );
    if (res.ok) {
      const data = await res.json();
      weather = { temperature: data.current_weather.temperature, weathercode: data.current_weather.weathercode };
    }
  } catch {
    // Weather API unreachable — degrade gracefully, no recommendation rather than a broken page.
  }
  if (!weather) return NextResponse.json({ available: false });

  const condition = classify(weather.temperature, weather.weathercode);
  const items = condition === "mild" ? [] : await query(
    `SELECT id, name, price FROM menu_items WHERE outlet_id = $1 AND weather_tag = $2 AND is_available = true ORDER BY name LIMIT 6`,
    [outletId, condition]
  );

  return NextResponse.json({
    available: true,
    condition,
    temperature_c: Math.round(weather.temperature),
    country: coords.country_name,
    items,
  });
}
