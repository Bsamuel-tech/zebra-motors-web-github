// ---------------------------------------------------------------------------
// ZEBRA AI: BUSINESS ANALYST GROUNDWORK
// ---------------------------------------------------------------------------
// AI architecture spec, item 21: real aggregate queries an admin (or later,
// an admin-facing AI assistant using these as tools) can ask for, such as
// "which vehicle gets rented most" or "which destinations are most
// requested". Every number below is a real SQL aggregate over real rows,
// never a fabricated statistic. Where Zebra genuinely does not have enough
// real (non-demo) data yet for a number to mean anything, this says so
// honestly instead of returning a hollow zero or an invented placeholder.
// ---------------------------------------------------------------------------
import { getDb } from "./client";

export async function getVehicleUtilization() {
  const db = await getDb();
  const rows = await db
    .prepare(
      `SELECT v.id as slug, v.display_name as name, COUNT(b.id) as bookingCount,
              COALESCE(SUM(julianday(b.return_date) - julianday(b.pickup_date)), 0) as bookedDays
       FROM vehicles v
       LEFT JOIN bookings b ON b.vehicle_id = v.id AND b.is_demo = 0 AND b.status != 'CANCELLED'
       GROUP BY v.id
       ORDER BY bookingCount DESC`
    )
    .all();
  return rows.map((r) => ({ slug: r.slug, name: r.name, bookingCount: r.bookingCount, bookedDays: Math.round(r.bookedDays) }));
}

export async function getPopularDestinations({ limit = 10 } = {}) {
  const db = await getDb();
  const rows = await db
    .prepare(
      `SELECT d.name, d.region, COUNT(s.id) as selections
       FROM destinations d
       LEFT JOIN destination_selections s ON s.destination_id = d.id
       WHERE d.published = 1
       GROUP BY d.id
       ORDER BY selections DESC
       LIMIT ?`
    )
    .all(limit);
  return rows.map((r) => ({ name: r.name, region: r.region, selections: r.selections }));
}

// Real average, only over bookings that actually have a routed distance on
// file (planned_distance_km, set only from a real getRoute() result, never
// estimated, see lib/db/bookings.js createBooking()). Returns null with a
// count of 0 rather than 0 km if nothing qualifies, 0 km would misleadingly
// look like a real, tiny average.
export async function getAverageTripDistance() {
  const db = await getDb();
  const row = await db
    .prepare(
      `SELECT COUNT(*) as n, AVG(planned_distance_km) as avgKm
       FROM bookings WHERE is_demo = 0 AND planned_distance_km IS NOT NULL`
    )
    .get();
  if (!row.n) return { sampleSize: 0, averageKm: null, note: "No booking yet has a real routed distance on file." };
  return { sampleSize: row.n, averageKm: Math.round(row.avgKm) };
}
