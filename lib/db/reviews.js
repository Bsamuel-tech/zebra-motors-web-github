// Server-only. Review moderation (Rule 4, Rule 15). Nothing here is ever
// invented, seed.js loads only the real reviews confirmed on
// zebramotors.rw, admin can publish/unpublish but not fabricate new ones
// through this API.
import { getDb, newId, nowIso } from "./client";

function rowToReview(row) {
  return {
    id: row.id,
    name: row.name,
    stars: row.stars,
    text: row.text,
    source: row.source,
    country: row.country,
    verified: !!row.verified,
    published: !!row.published,
    createdAt: row.created_at,
  };
}

export function getReviews({ publishedOnly = false } = {}) {
  const db = getDb();
  const rows = publishedOnly
    ? db.prepare("SELECT * FROM reviews WHERE published = 1 ORDER BY created_at ASC").all()
    : db.prepare("SELECT * FROM reviews ORDER BY created_at ASC").all();
  return rows.map(rowToReview);
}

export function createReview(input) {
  const db = getDb();
  const id = newId();
  db.prepare(
    `INSERT INTO reviews (id, name, stars, text, source, country, verified, published, created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).run(
    id,
    input.name,
    input.stars,
    input.text,
    input.source || "zebramotors.rw",
    input.country || null,
    input.verified ? 1 : 0,
    input.published === false ? 0 : 1,
    nowIso()
  );
  return getReviews().find((r) => r.id === id);
}

export function setReviewPublished(id, published) {
  const db = getDb();
  db.prepare("UPDATE reviews SET published = ? WHERE id = ?").run(published ? 1 : 0, id);
  return getReviews().find((r) => r.id === id);
}
