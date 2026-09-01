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

export async function getReviews({ publishedOnly = false } = {}) {
  const db = await getDb();
  const rows = publishedOnly
    ? await db.prepare("SELECT * FROM reviews WHERE published = 1 ORDER BY created_at ASC").all()
    : await db.prepare("SELECT * FROM reviews ORDER BY created_at ASC").all();
  return rows.map(rowToReview);
}

export async function createReview(input) {
  const db = await getDb();
  const id = newId();
  await db
    .prepare(
      `INSERT INTO reviews (id, name, stars, text, source, country, verified, published, created_at)
       VALUES (?,?,?,?,?,?,?,?,?)`
    )
    .run(
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
  const reviews = await getReviews();
  return reviews.find((r) => r.id === id);
}

export async function setReviewPublished(id, published) {
  const db = await getDb();
  await db.prepare("UPDATE reviews SET published = ? WHERE id = ?").run(published ? 1 : 0, id);
  const reviews = await getReviews();
  return reviews.find((r) => r.id === id);
}
