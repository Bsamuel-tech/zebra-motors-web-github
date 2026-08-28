// Server-only. First-party page view logging (Section 3G). No third-party
// script, no cookies, no IP address or user agent stored, just a path and
// a timestamp, recorded from the server component that already renders the
// page. Good enough to answer "which pages and vehicles get looked at",
// not a replacement for a real analytics platform if one is chosen later.
import { getDb, newId, nowIso } from "./client";

export function recordPageView(pagePath, vehicleId = null) {
  try {
    getDb()
      .prepare("INSERT INTO page_views (id, path, vehicle_id, created_at) VALUES (?,?,?,?)")
      .run(newId(), pagePath, vehicleId, nowIso());
  } catch {
    // Never let analytics logging break a page render.
  }
}

export function getAnalyticsSummary({ days = 30 } = {}) {
  const db = getDb();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const totalViews = db.prepare("SELECT COUNT(*) as c FROM page_views WHERE created_at >= ?").get(since).c;

  const topPages = db
    .prepare(
      `SELECT path, COUNT(*) as views FROM page_views WHERE created_at >= ?
       GROUP BY path ORDER BY views DESC LIMIT 10`
    )
    .all(since);

  const topVehicles = db
    .prepare(
      `SELECT v.display_name as name, v.slug as slug, COUNT(*) as views
       FROM page_views p JOIN vehicles v ON v.id = p.vehicle_id
       WHERE p.created_at >= ? AND p.vehicle_id IS NOT NULL
       GROUP BY p.vehicle_id ORDER BY views DESC LIMIT 10`
    )
    .all(since);

  const byDay = db
    .prepare(
      `SELECT substr(created_at, 1, 10) as day, COUNT(*) as views
       FROM page_views WHERE created_at >= ?
       GROUP BY day ORDER BY day ASC`
    )
    .all(since);

  return { totalViews, topPages, topVehicles, byDay, days };
}
