// ---------------------------------------------------------------------------
// GEOCODING AND ROUTING PROVIDER (P2 of the trip planner spec)
// ---------------------------------------------------------------------------
// Server-only. This is the one place in the codebase that knows which real
// mapping vendor is behind geocoding and routing, everything else (the trip
// planner, the destination admin form) calls geocodePlace() / getRoute()
// and never talks to a vendor API directly. Swapping to a paid provider
// later (Mapbox, Google, HERE) means rewriting the two functions in this
// file, nothing else.
//
// Right now, per the explicit answer given when this phase was scoped ("No
// key yet, use free OSM services for now"), this uses:
//   - Nominatim (nominatim.openstreetmap.org) for geocoding
//   - the public OSRM demo router (router.project-osrm.org) for routing
// Both are free, unauthenticated, rate-limited, and carry no uptime
// guarantee, they are meant for light testing, not production traffic.
// Nominatim's usage policy requires a real identifying User-Agent and caps
// requests at roughly one per second, both are respected below. Every
// result is cached (lib/db/geoCache.js) specifically so this app calls
// these services as little as possible.
//
// On any failure (timeout, rate limit, no match, network error) both
// functions return null. Nothing in this codebase is allowed to invent a
// coordinate, a distance, or a drive time when the real lookup fails, the
// caller must show an honest "not available" state instead (Rule 2).
// ---------------------------------------------------------------------------
import { getCachedGeocode, saveGeocode, getCachedRoute, saveRoute } from "../db/geoCache";

const USER_AGENT = "ZebraMotorsWeb/1.0 (contact: info@zebramotor.rw)";
const FETCH_TIMEOUT_MS = 6000;
const NOMINATIM_MIN_INTERVAL_MS = 1100;

let lastNominatimCallAt = 0;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function respectNominatimRateLimit() {
  const wait = NOMINATIM_MIN_INTERVAL_MS - (Date.now() - lastNominatimCallAt);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastNominatimCallAt = Date.now();
}

// Resolves a free-text place name to real coordinates, or null. Cached by
// exact query text so the same place is never looked up twice.
export async function geocodePlace(query) {
  if (!query || !query.trim()) return null;
  const cached = getCachedGeocode(query);
  if (cached) return cached;

  try {
    await respectNominatimRateLimit();
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const res = await fetchWithTimeout(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
    if (!res.ok) return null;
    const results = await res.json();
    if (!Array.isArray(results) || results.length === 0) return null;
    const top = results[0];
    const result = { lat: parseFloat(top.lat), lng: parseFloat(top.lon), displayName: top.display_name, provider: "nominatim" };
    if (!Number.isFinite(result.lat) || !Number.isFinite(result.lng)) return null;
    saveGeocode(query, result);
    return result;
  } catch {
    // Timeout, network failure, or the demo server being unavailable, all
    // treated the same, an honest "could not geocode this", never a guess.
    return null;
  }
}

function routeCacheKey(points) {
  return points.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join(";");
}

// Real drive distance and duration for an ordered list of {lat, lng}
// points (2 or more), or null if it could not be computed. geometry is an
// array of [lat, lng] pairs describing the actual road-following route
// line, for drawing on a map, also null on failure.
export async function getRoute(points) {
  if (!Array.isArray(points) || points.length < 2) return null;
  const key = routeCacheKey(points);
  const cached = getCachedRoute(key);
  if (cached) return cached;

  try {
    const coordString = points.map((p) => `${p.lng},${p.lat}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;
    const res = await fetchWithTimeout(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) return null;
    const body = await res.json();
    const route = body?.routes?.[0];
    if (!route || typeof route.distance !== "number" || typeof route.duration !== "number") return null;
    const result = {
      distanceKm: route.distance / 1000,
      durationMinutes: route.duration / 60,
      geometry: Array.isArray(route.geometry?.coordinates)
        ? route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
        : null,
      // Per-segment distance/time between each consecutive pair of stops,
      // straight from OSRM's own leg breakdown, not derived or estimated.
      legs: Array.isArray(route.legs)
        ? route.legs.map((leg) => ({ distanceKm: leg.distance / 1000, durationMinutes: leg.duration / 60 }))
        : null,
      provider: "osrm-demo",
    };
    saveRoute(key, result);
    return result;
  } catch {
    return null;
  }
}
