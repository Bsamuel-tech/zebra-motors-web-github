// ---------------------------------------------------------------------------
// RENTAL EXTRAS (real, admin-controlled optional services)
// ---------------------------------------------------------------------------
// Replaces the old hardcoded booking fees (airport delivery, GPS, child
// seat, extra driver) that used to be fixed numbers in components/
// BookingFlow.js nobody at Zebra had actually confirmed. Real rows live in
// the rental_extras table, seeded inactive with no price (see
// lib/db/seedData.js), and only ever shown to a customer once an admin sets
// a real price on /admin/extras and switches it on.
//
// Rule: an extra is only ever shown publicly when active = 1 AND
// (price_rwf is set OR pricing_type = 'CUSTOM_QUOTE'). A CUSTOM_QUOTE extra
// has no fixed price by design (the price is worked out with Zebra
// directly), so it can be active without a price_rwf value.
// ---------------------------------------------------------------------------
import { getDb, newId, nowIso } from "./client";

const PRICING_TYPES = ["PER_DAY", "PER_BOOKING", "PER_KM", "CUSTOM_QUOTE"];

function rowToExtra(row) {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    pricingType: row.pricing_type,
    priceRWF: row.price_rwf,
    active: !!row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// A row is safe to show to a real customer only when it is switched on and
// either has a real confirmed price, or is deliberately priced on request
// (CUSTOM_QUOTE). Anything else stays admin-only until Zebra confirms it.
function isPubliclyVisible(row) {
  if (!row.active) return false;
  if (row.pricing_type === "CUSTOM_QUOTE") return true;
  return row.price_rwf !== null && row.price_rwf !== undefined;
}

export async function getExtras({ activeOnly = false } = {}) {
  const db = await getDb();
  const rows = await db.prepare("SELECT * FROM rental_extras ORDER BY created_at ASC").all();
  const filtered = activeOnly ? rows.filter(isPubliclyVisible) : rows;
  return filtered.map(rowToExtra);
}

export async function getExtraById(id) {
  const db = await getDb();
  const row = await db.prepare("SELECT * FROM rental_extras WHERE id = ?").get(id);
  return row ? rowToExtra(row) : null;
}

export async function getExtraByKey(key) {
  const db = await getDb();
  const row = await db.prepare("SELECT * FROM rental_extras WHERE key = ?").get(key);
  return row ? rowToExtra(row) : null;
}

export async function updateExtra(id, { name, description, pricingType, priceRWF, active }) {
  const db = await getDb();
  const existing = await getExtraById(id);
  if (!existing) return null;

  if (pricingType !== undefined && !PRICING_TYPES.includes(pricingType)) {
    throw new Error(`pricingType must be one of ${PRICING_TYPES.join(", ")}`);
  }

  const sets = [];
  const values = [];
  if (name !== undefined) {
    sets.push("name = ?");
    values.push(name);
  }
  if (description !== undefined) {
    sets.push("description = ?");
    values.push(description);
  }
  if (pricingType !== undefined) {
    sets.push("pricing_type = ?");
    values.push(pricingType);
  }
  if (priceRWF !== undefined) {
    sets.push("price_rwf = ?");
    values.push(priceRWF === null ? null : Number(priceRWF));
  }
  if (active !== undefined) {
    sets.push("active = ?");
    values.push(active ? 1 : 0);
  }
  if (sets.length) {
    sets.push("updated_at = ?");
    values.push(nowIso());
    values.push(id);
    await db.prepare(`UPDATE rental_extras SET ${sets.join(", ")} WHERE id = ?`).run(...values);
  }
  return getExtraById(id);
}

// For a future custom extra beyond the four seeded ones, admin-created,
// same honesty rule applies: starts inactive with no price unless the
// caller explicitly supplies one.
export async function createExtra({ key, name, description, pricingType, priceRWF, active }) {
  if (!key || !name) throw new Error("key and name are required");
  if (pricingType && !PRICING_TYPES.includes(pricingType)) {
    throw new Error(`pricingType must be one of ${PRICING_TYPES.join(", ")}`);
  }
  const db = await getDb();
  const id = newId();
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO rental_extras (id, key, name, description, pricing_type, price_rwf, active, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?)`
    )
    .run(
      id,
      key,
      name,
      description || "",
      pricingType || "PER_BOOKING",
      priceRWF ?? null,
      active ? 1 : 0,
      now,
      now
    );
  return getExtraById(id);
}
