// ---------------------------------------------------------------------------
// DESTINATIONS (P1 of the trip planner spec, real data replacing the
// hardcoded 5-name list that used to live in components/TripPlanner.js).
// ---------------------------------------------------------------------------
import { getDb, newId, nowIso } from "./client";
import { getPhotosForDestination } from "./destinationPhotos";

export const DESTINATION_CATEGORIES = [
  "CITY",
  "NATIONAL_PARK",
  "LAKE",
  "MOUNTAIN",
  "AIRPORT",
  "HOTEL",
  "ATTRACTION",
  "CUSTOM",
];

function rowToDestination(row) {
  return {
    id: row.slug,
    dbId: row.id,
    name: row.name,
    description: row.description,
    lat: row.lat,
    lng: row.lng,
    region: row.region,
    category: row.category,
    recommendedVehicleCategory: row.recommended_vehicle_category,
    notes: row.notes,
    selectionCount: row.selection_count || 0,
    published: !!row.published,
    photos: getPhotosForDestination(row.id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// query does the "unrestricted destination search" the spec asks for, a
// plain substring match across name, region, and description, never
// limited to a fixed short list of buttons.
const SELECT_WITH_COUNT = `
  SELECT d.*, (SELECT COUNT(*) FROM destination_selections s WHERE s.destination_id = d.id) as selection_count
  FROM destinations d
`;

export function getDestinations({ publishedOnly = false, query = "" } = {}) {
  const db = getDb();
  let sql = SELECT_WITH_COUNT;
  const clauses = [];
  const params = [];
  if (publishedOnly) clauses.push("published = 1");
  if (query && query.trim()) {
    clauses.push("(name LIKE ? OR region LIKE ? OR description LIKE ?)");
    const like = `%${query.trim()}%`;
    params.push(like, like, like);
  }
  if (clauses.length) sql += " WHERE " + clauses.join(" AND ");
  sql += " ORDER BY name ASC";
  const rows = db.prepare(sql).all(...params);
  return rows.map(rowToDestination);
}

// Real popularity signal: called once whenever a customer adds this real,
// published destination to a route in the trip planner. Never called for
// a custom (not-in-catalogue) stop, those go to
// logCustomDestinationRequest() instead.
export function recordDestinationSelection(destinationId) {
  const db = getDb();
  const exists = db.prepare("SELECT id FROM destinations WHERE id = ?").get(destinationId);
  if (!exists) return;
  db.prepare("INSERT INTO destination_selections (id, destination_id, created_at) VALUES (?,?,?)").run(
    newId(),
    destinationId,
    nowIso()
  );
}

export function getDestinationBySlug(slug) {
  const row = getDb().prepare(`${SELECT_WITH_COUNT} WHERE d.slug = ?`).get(slug);
  return row ? rowToDestination(row) : null;
}

export function getDestinationByDbId(id) {
  const row = getDb().prepare(`${SELECT_WITH_COUNT} WHERE d.id = ?`).get(id);
  return row ? rowToDestination(row) : null;
}

export function createDestination(input) {
  if (!input?.name) throw new Error("name is required");
  const category = DESTINATION_CATEGORIES.includes(input.category) ? input.category : "CUSTOM";
  const db = getDb();
  const id = newId();
  const now = nowIso();
  const slug = input.slug ? slugify(input.slug) : slugify(input.name);
  db.prepare(
    `INSERT INTO destinations
      (id, slug, name, description, lat, lng, region, category, recommended_vehicle_category, notes, published, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    id,
    slug,
    input.name,
    input.description || "",
    input.lat ?? null,
    input.lng ?? null,
    input.region || "",
    category,
    input.recommendedVehicleCategory || null,
    input.notes || "",
    input.published ? 1 : 0,
    now,
    now
  );
  return getDestinationByDbId(id);
}

const PATCHABLE = {
  name: "name",
  description: "description",
  lat: "lat",
  lng: "lng",
  region: "region",
  recommendedVehicleCategory: "recommended_vehicle_category",
  notes: "notes",
};

export function updateDestination(dbId, patch) {
  const db = getDb();
  const sets = [];
  const values = [];
  for (const [key, column] of Object.entries(PATCHABLE)) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      sets.push(`${column} = ?`);
      values.push(patch[key]);
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, "category")) {
    sets.push("category = ?");
    values.push(DESTINATION_CATEGORIES.includes(patch.category) ? patch.category : "CUSTOM");
  }
  if (Object.prototype.hasOwnProperty.call(patch, "published")) {
    sets.push("published = ?");
    values.push(patch.published ? 1 : 0);
  }
  if (!sets.length) return getDestinationByDbId(dbId);
  sets.push("updated_at = ?");
  values.push(nowIso());
  values.push(dbId);
  db.prepare(`UPDATE destinations SET ${sets.join(", ")} WHERE id = ?`).run(...values);
  return getDestinationByDbId(dbId);
}

// Unpublish rather than delete, the same choice made for vehicles
// (archiveVehicle), so a mistaken removal never loses real admin-entered
// content, it just stops showing on the public site and trip planner.
export function unpublishDestination(dbId) {
  return updateDestination(dbId, { published: false });
}

// A customer's own typed destination that is not in the real catalogue.
// Logged as a demand signal only, never auto-published (see
// prisma/schema.sql's comment on custom_destination_requests).
export function logCustomDestinationRequest({ name, notes = "", source = "trip_planner" }) {
  if (!name || !name.trim()) return null;
  const db = getDb();
  const id = newId();
  db.prepare(
    `INSERT INTO custom_destination_requests (id, name, notes, source, created_at)
     VALUES (?,?,?,?,?)`
  ).run(id, name.trim(), notes, source, nowIso());
  return { id, name: name.trim(), notes, source };
}

export function getCustomDestinationRequests() {
  return getDb().prepare("SELECT * FROM custom_destination_requests ORDER BY created_at DESC").all();
}
