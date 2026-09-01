// Server-only. Real fleet data access, backing /admin/fleet and the public
// fleet pages. Row shape matches the old /data/vehicles.js array entries
// (id, name, year, category, ...) so existing display components
// (VehicleCard, the vehicle detail page) need minimal changes.
import { getDb, newId, nowIso } from "./client";
import { getPhotosForVehicle } from "./vehiclePhotos";

// UNLIMITED needs no numbers at all. DAILY_ALLOWANCE compares real trip
// distance against includedKmPerDay * rental days, TOTAL_ALLOWANCE compares
// against a single includedTotalKm regardless of rental length. Every
// vehicle starts UNLIMITED with no numbers set, the honest default until
// Zebra confirms a real per-vehicle policy (Rule 2).
export const MILEAGE_POLICY_TYPES = ["UNLIMITED", "DAILY_ALLOWANCE", "TOTAL_ALLOWANCE"];

function rowToVehicle(row) {
  return {
    id: row.slug, // public-facing id stays the readable slug, e.g. "kia-sorento"
    dbId: row.id, // internal database id, used for admin edit/delete links
    photos: getPhotosForVehicle(row.id),
    name: row.display_name,
    make: row.make,
    model: row.model,
    year: row.year,
    category: row.category,
    seats: row.seats,
    doors: row.doors,
    transmission: row.transmission,
    fuel: row.fuel,
    drive: row.drive,
    luggage: row.luggage,
    ac: !!row.ac,
    dailyRateRWFMin: row.daily_rate_rwf_min,
    dailyRateRWFMax: row.daily_rate_rwf_max,
    tags: JSON.parse(row.tags),
    badge: row.badge,
    description: row.description,
    shortDescription: row.short_description,
    status: row.status,
    featured: !!row.featured,
    mileagePolicyType: row.mileage_policy_type || "UNLIMITED",
    includedKmPerDay: row.included_km_per_day,
    includedTotalKm: row.included_total_km,
    extraKmRateRWF: row.extra_km_rate_rwf,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Public fleet views only ever see AVAILABLE, RESERVED, or RENTED vehicles,
// never MAINTENANCE, UNAVAILABLE, or ARCHIVED ones, per Rule 10: an
// unavailable vehicle must not be offered for booking at all.
const PUBLIC_STATUSES = ["AVAILABLE", "RESERVED", "RENTED"];

export function getVehicles({ includeAll = false } = {}) {
  const db = getDb();
  const rows = includeAll
    ? db.prepare("SELECT * FROM vehicles ORDER BY created_at ASC").all()
    : db
        .prepare(
          `SELECT * FROM vehicles WHERE status IN (${PUBLIC_STATUSES.map(() => "?").join(",")}) ORDER BY created_at ASC`
        )
        .all(...PUBLIC_STATUSES);
  return rows.map(rowToVehicle);
}

export function getVehicleBySlug(slug) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM vehicles WHERE slug = ?").get(slug);
  return row ? rowToVehicle(row) : null;
}

export function getVehicleByDbId(id) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(id);
  return row ? rowToVehicle(row) : null;
}

export function createVehicle(input) {
  const db = getDb();
  const id = newId();
  const now = nowIso();
  const mileagePolicyType = MILEAGE_POLICY_TYPES.includes(input.mileagePolicyType)
    ? input.mileagePolicyType
    : "UNLIMITED";
  db.prepare(
    `INSERT INTO vehicles
      (id, slug, make, model, display_name, year, category, transmission, fuel, drive,
       doors, seats, luggage, ac, daily_rate_rwf_min, daily_rate_rwf_max, tags, badge,
       description, short_description, status, featured,
       mileage_policy_type, included_km_per_day, included_total_km, extra_km_rate_rwf,
       created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    id,
    input.slug,
    input.make,
    input.model,
    input.name,
    input.year,
    input.category,
    input.transmission,
    input.fuel,
    input.drive || "2WD",
    input.doors,
    input.seats,
    input.luggage || "",
    input.ac ? 1 : 0,
    input.dailyRateRWFMin,
    input.dailyRateRWFMax,
    JSON.stringify(input.tags || []),
    input.badge || null,
    input.description || "",
    input.shortDescription || null,
    input.status || "AVAILABLE",
    input.featured === false ? 0 : 1,
    mileagePolicyType,
    mileagePolicyType === "DAILY_ALLOWANCE" ? input.includedKmPerDay ?? null : null,
    mileagePolicyType === "TOTAL_ALLOWANCE" ? input.includedTotalKm ?? null : null,
    mileagePolicyType === "UNLIMITED" ? null : input.extraKmRateRWF ?? null,
    now,
    now
  );
  return getVehicleByDbId(id);
}

const PATCHABLE = {
  name: "display_name",
  make: "make",
  model: "model",
  year: "year",
  category: "category",
  transmission: "transmission",
  fuel: "fuel",
  drive: "drive",
  doors: "doors",
  seats: "seats",
  luggage: "luggage",
  dailyRateRWFMin: "daily_rate_rwf_min",
  dailyRateRWFMax: "daily_rate_rwf_max",
  badge: "badge",
  description: "description",
  shortDescription: "short_description",
  status: "status",
  includedKmPerDay: "included_km_per_day",
  includedTotalKm: "included_total_km",
  extraKmRateRWF: "extra_km_rate_rwf",
};

export function updateVehicle(dbId, patch) {
  const db = getDb();
  const sets = [];
  const values = [];
  for (const [key, column] of Object.entries(PATCHABLE)) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      sets.push(`${column} = ?`);
      values.push(patch[key]);
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, "ac")) {
    sets.push("ac = ?");
    values.push(patch.ac ? 1 : 0);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "featured")) {
    sets.push("featured = ?");
    values.push(patch.featured ? 1 : 0);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "tags")) {
    sets.push("tags = ?");
    values.push(JSON.stringify(patch.tags));
  }
  if (Object.prototype.hasOwnProperty.call(patch, "mileagePolicyType")) {
    const type = MILEAGE_POLICY_TYPES.includes(patch.mileagePolicyType) ? patch.mileagePolicyType : "UNLIMITED";
    sets.push("mileage_policy_type = ?");
    values.push(type);
    // Changing the policy type clears the numbers that no longer apply,
    // so a vehicle switched back to UNLIMITED never keeps a stale
    // allowance/rate hanging around that the UI would otherwise have to
    // hide manually.
    if (type !== "DAILY_ALLOWANCE" && !Object.prototype.hasOwnProperty.call(patch, "includedKmPerDay")) {
      sets.push("included_km_per_day = ?");
      values.push(null);
    }
    if (type !== "TOTAL_ALLOWANCE" && !Object.prototype.hasOwnProperty.call(patch, "includedTotalKm")) {
      sets.push("included_total_km = ?");
      values.push(null);
    }
    if (type === "UNLIMITED" && !Object.prototype.hasOwnProperty.call(patch, "extraKmRateRWF")) {
      sets.push("extra_km_rate_rwf = ?");
      values.push(null);
    }
  }
  if (!sets.length) return getVehicleByDbId(dbId);
  sets.push("updated_at = ?");
  values.push(nowIso());
  values.push(dbId);
  db.prepare(`UPDATE vehicles SET ${sets.join(", ")} WHERE id = ?`).run(...values);
  return getVehicleByDbId(dbId);
}

// Vehicles are archived, never hard-deleted, so booking history and audit
// logs referencing them stay intact.
export function archiveVehicle(dbId) {
  return updateVehicle(dbId, { status: "ARCHIVED" });
}
