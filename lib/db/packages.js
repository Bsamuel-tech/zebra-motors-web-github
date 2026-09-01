// Server-only. Travel package content management (Section 12).
import { getDb, newId, nowIso } from "./client";

function rowToPackage(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    duration: row.duration,
    summary: row.summary,
    includes: JSON.parse(row.includes),
    bestFor: JSON.parse(row.best_for),
    published: !!row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getPackages({ publishedOnly = false } = {}) {
  const db = await getDb();
  const rows = publishedOnly
    ? await db.prepare("SELECT * FROM packages WHERE published = 1 ORDER BY created_at ASC").all()
    : await db.prepare("SELECT * FROM packages ORDER BY created_at ASC").all();
  return rows.map(rowToPackage);
}

export async function getPackageBySlug(slug) {
  const db = await getDb();
  const row = await db.prepare("SELECT * FROM packages WHERE slug = ?").get(slug);
  return row ? rowToPackage(row) : null;
}

export async function getPackageById(id) {
  const db = await getDb();
  const row = await db.prepare("SELECT * FROM packages WHERE id = ?").get(id);
  return row ? rowToPackage(row) : null;
}

export async function createPackage(input) {
  const db = await getDb();
  const id = newId();
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO packages (id, slug, name, duration, summary, includes, best_for, published, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,1,?,?)`
    )
    .run(
      id,
      input.slug,
      input.name,
      input.duration,
      input.summary,
      JSON.stringify(input.includes || []),
      JSON.stringify(input.bestFor || []),
      now,
      now
    );
  return getPackageById(id);
}

export async function updatePackage(id, patch) {
  const db = await getDb();
  const sets = [];
  const values = [];
  const map = { name: "name", duration: "duration", summary: "summary" };
  for (const [key, column] of Object.entries(map)) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      sets.push(`${column} = ?`);
      values.push(patch[key]);
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, "includes")) {
    sets.push("includes = ?");
    values.push(JSON.stringify(patch.includes));
  }
  if (Object.prototype.hasOwnProperty.call(patch, "bestFor")) {
    sets.push("best_for = ?");
    values.push(JSON.stringify(patch.bestFor));
  }
  if (Object.prototype.hasOwnProperty.call(patch, "published")) {
    sets.push("published = ?");
    values.push(patch.published ? 1 : 0);
  }
  if (!sets.length) return getPackageById(id);
  sets.push("updated_at = ?");
  values.push(nowIso());
  values.push(id);
  await db.prepare(`UPDATE packages SET ${sets.join(", ")} WHERE id = ?`).run(...values);
  return getPackageById(id);
}
