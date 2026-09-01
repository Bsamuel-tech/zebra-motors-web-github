// Server-only. Real vehicle photo management. Files themselves are saved to
// disk under public/uploads/vehicles/<vehicleId>/ (see app/api/vehicles/[id]/photos/route.js),
// this file only manages the database records pointing at them. Until Zebra's
// real photo shoot happens (see the photography brief in the design system
// notes), vehicles simply have no rows here and the public site falls back
// to the grey placeholder in components/Photo.js, never a stock or invented
// image (Rule 5).
import { getDb, newId, nowIso } from "./client";

function rowToPhoto(row) {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    url: row.url,
    altText: row.alt_text,
    isPrimary: !!row.is_primary,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export async function getPhotosForVehicle(vehicleId) {
  const db = await getDb();
  const rows = await db
    .prepare("SELECT * FROM vehicle_photos WHERE vehicle_id = ? ORDER BY is_primary DESC, sort_order ASC, created_at ASC")
    .all(vehicleId);
  return rows.map(rowToPhoto);
}

export async function getPhotoById(id) {
  const db = await getDb();
  const row = await db.prepare("SELECT * FROM vehicle_photos WHERE id = ?").get(id);
  return row ? rowToPhoto(row) : null;
}

export async function addPhoto({ vehicleId, url, altText = "", isPrimary = false }) {
  const db = await getDb();
  const id = newId();
  const now = nowIso();
  // A brand new photo becomes primary automatically if this vehicle has none yet.
  const existingCount = (await db.prepare("SELECT COUNT(*) as c FROM vehicle_photos WHERE vehicle_id = ?").get(vehicleId)).c;
  const makePrimary = isPrimary || Number(existingCount) === 0;
  if (makePrimary) {
    await db.prepare("UPDATE vehicle_photos SET is_primary = 0 WHERE vehicle_id = ?").run(vehicleId);
  }
  await db
    .prepare(
      `INSERT INTO vehicle_photos (id, vehicle_id, url, alt_text, is_primary, sort_order, created_at)
       VALUES (?,?,?,?,?,?,?)`
    )
    .run(id, vehicleId, url, altText, makePrimary ? 1 : 0, existingCount, now);
  return getPhotoById(id);
}

export async function setPrimaryPhoto(id, vehicleId) {
  const db = await getDb();
  await db.prepare("UPDATE vehicle_photos SET is_primary = 0 WHERE vehicle_id = ?").run(vehicleId);
  await db.prepare("UPDATE vehicle_photos SET is_primary = 1 WHERE id = ? AND vehicle_id = ?").run(id, vehicleId);
  return getPhotoById(id);
}

// Returns the row as it was before deletion so the caller can also remove
// the underlying file from disk.
export async function deletePhoto(id) {
  const photo = await getPhotoById(id);
  if (!photo) return null;
  const db = await getDb();
  await db.prepare("DELETE FROM vehicle_photos WHERE id = ?").run(id);
  if (photo.isPrimary) {
    const next = await db
      .prepare("SELECT id FROM vehicle_photos WHERE vehicle_id = ? ORDER BY sort_order ASC, created_at ASC LIMIT 1")
      .get(photo.vehicleId);
    if (next) {
      await db.prepare("UPDATE vehicle_photos SET is_primary = 1 WHERE id = ?").run(next.id);
    }
  }
  return photo;
}
