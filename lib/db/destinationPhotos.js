// Server-only. Real destination photo management, the same pattern as
// lib/db/vehiclePhotos.js. Files are saved to disk under
// uploads/destinations/<destinationId>/ (see
// app/api/destinations/[id]/photos/route.js), this file only manages the
// database records pointing at them. A destination with no upload yet has
// no rows here and the public site falls back to the grey placeholder,
// never a stock or generated image (Rule 5).
import { getDb, newId, nowIso } from "./client";

function rowToPhoto(row) {
  return {
    id: row.id,
    destinationId: row.destination_id,
    url: row.url,
    altText: row.alt_text,
    isPrimary: !!row.is_primary,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export function getPhotosForDestination(destinationId) {
  const rows = getDb()
    .prepare("SELECT * FROM destination_photos WHERE destination_id = ? ORDER BY is_primary DESC, sort_order ASC, created_at ASC")
    .all(destinationId);
  return rows.map(rowToPhoto);
}

export function getDestinationPhotoById(id) {
  const row = getDb().prepare("SELECT * FROM destination_photos WHERE id = ?").get(id);
  return row ? rowToPhoto(row) : null;
}

export function addDestinationPhoto({ destinationId, url, altText = "", isPrimary = false }) {
  const db = getDb();
  const id = newId();
  const now = nowIso();
  const existingCount = db.prepare("SELECT COUNT(*) as c FROM destination_photos WHERE destination_id = ?").get(destinationId).c;
  const makePrimary = isPrimary || existingCount === 0;
  if (makePrimary) {
    db.prepare("UPDATE destination_photos SET is_primary = 0 WHERE destination_id = ?").run(destinationId);
  }
  db.prepare(
    `INSERT INTO destination_photos (id, destination_id, url, alt_text, is_primary, sort_order, created_at)
     VALUES (?,?,?,?,?,?,?)`
  ).run(id, destinationId, url, altText, makePrimary ? 1 : 0, existingCount, now);
  return getDestinationPhotoById(id);
}

export function setPrimaryDestinationPhoto(id, destinationId) {
  const db = getDb();
  db.prepare("UPDATE destination_photos SET is_primary = 0 WHERE destination_id = ?").run(destinationId);
  db.prepare("UPDATE destination_photos SET is_primary = 1 WHERE id = ? AND destination_id = ?").run(id, destinationId);
  return getDestinationPhotoById(id);
}

export function deleteDestinationPhoto(id) {
  const photo = getDestinationPhotoById(id);
  if (!photo) return null;
  getDb().prepare("DELETE FROM destination_photos WHERE id = ?").run(id);
  if (photo.isPrimary) {
    const next = getDb()
      .prepare("SELECT id FROM destination_photos WHERE destination_id = ? ORDER BY sort_order ASC, created_at ASC LIMIT 1")
      .get(photo.destinationId);
    if (next) {
      getDb().prepare("UPDATE destination_photos SET is_primary = 1 WHERE id = ?").run(next.id);
    }
  }
  return photo;
}
