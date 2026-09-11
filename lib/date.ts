/**
 * "Today" as a YYYY-MM-DD string, in the CALLER's own local calendar date.
 *
 * Use this only for client-side UI conveniences where the person looking at
 * the screen is genuinely the right reference point — e.g. defaulting a date
 * picker to "today" as they perceive it. It is NOT correct for any
 * business-rule check (voucher validity, promotion windows, report ranges) —
 * those must use businessDateStr() with the outlet's own country timezone,
 * since the browser or server's local clock has nothing to do with where the
 * outlet actually operates.
 *
 * (`Date#toISOString()` reports the UTC date, which silently shifts a day
 * backward for several hours after local midnight in every timezone ahead of
 * UTC — including every Southeast Asian market this product targets. That's
 * the bug this replaces for picker defaults; see businessDateStr for the
 * server-side authoritative version.)
 */
export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * "Today" (or any date) as a YYYY-MM-DD string in a SPECIFIC IANA timezone —
 * e.g. the outlet's own country ("Asia/Singapore", "Asia/Bangkok", ...).
 *
 * This is the one that's actually correct for multi-country business logic:
 * it doesn't matter where the app server is hosted or where a browser
 * happens to be — a Singapore outlet's "today" is always Singapore's
 * calendar day. Never derive business-rule dates from the server's ambient
 * clock or from raw UTC; both drift relative to the outlet's real business day.
 */
export function businessDateStr(timezone: string, d: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD directly, which is exactly what SQL date
  // comparisons need — no manual reassembly of parts.
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** The 1st of "this month" as the outlet's own timezone sees it right now — for report-range defaults. */
export function businessMonthStartStr(timezone: string, d: Date = new Date()): string {
  const [year, month] = businessDateStr(timezone, d).split("-");
  return `${year}-${month}-01`;
}
