// Server-only. Persists real geocode and route lookups so the free public
// Nominatim and OSRM demo services are only ever called once per distinct
// query, see lib/geo/provider.js for why that matters. A cache miss is
// never treated as a reason to guess, the caller always falls through to a
// real API call or an honest "not available" result.
import { getDb, newId, nowIso } from "./client";

export async function getCachedGeocode(query) {
  const db = await getDb();
  const row = await db.prepare("SELECT * FROM geocode_cache WHERE query = ?").get(query.toLowerCase().trim());
  if (!row) return null;
  return { lat: row.lat, lng: row.lng, displayName: row.display_name, provider: row.provider };
}

export async function saveGeocode(query, { lat, lng, displayName, provider }) {
  const db = await getDb();
  await db
    .prepare(
      `INSERT INTO geocode_cache (id, query, lat, lng, display_name, provider, created_at)
       VALUES (?,?,?,?,?,?,?)
       ON CONFLICT(query) DO UPDATE SET lat = excluded.lat, lng = excluded.lng, display_name = excluded.display_name`
    )
    .run(newId(), query.toLowerCase().trim(), lat, lng, displayName || null, provider || "nominatim", nowIso());
}

export async function getCachedRoute(cacheKey) {
  const db = await getDb();
  const row = await db.prepare("SELECT * FROM route_cache WHERE cache_key = ?").get(cacheKey);
  if (!row) return null;
  return {
    distanceKm: row.distance_km,
    durationMinutes: row.duration_minutes,
    geometry: row.geometry ? JSON.parse(row.geometry) : null,
    legs: row.legs ? JSON.parse(row.legs) : null,
    provider: row.provider,
  };
}

export async function saveRoute(cacheKey, { distanceKm, durationMinutes, geometry, legs, provider }) {
  const db = await getDb();
  await db
    .prepare(
      `INSERT INTO route_cache (id, cache_key, distance_km, duration_minutes, geometry, legs, provider, created_at)
       VALUES (?,?,?,?,?,?,?,?)
       ON CONFLICT(cache_key) DO UPDATE SET distance_km = excluded.distance_km, duration_minutes = excluded.duration_minutes, geometry = excluded.geometry, legs = excluded.legs`
    )
    .run(
      newId(),
      cacheKey,
      distanceKm,
      durationMinutes,
      geometry ? JSON.stringify(geometry) : null,
      legs ? JSON.stringify(legs) : null,
      provider || "osrm-demo",
      nowIso()
    );
}
