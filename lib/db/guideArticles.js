// Server-only. Rwanda Guide CMS (Section 13/46). `content` is stored as a
// JSON-encoded array of paragraph strings, matching the shape the
// original /data/guideArticles.js used, so the public article page did not
// need to change how it renders body paragraphs.
import { getDb, newId, nowIso } from "./client";

function rowToArticle(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body: JSON.parse(row.content),
    category: row.category,
    status: row.status,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getArticles({ publishedOnly = false } = {}) {
  const db = await getDb();
  const rows = publishedOnly
    ? await db.prepare("SELECT * FROM guide_articles WHERE status = 'published' ORDER BY created_at ASC").all()
    : await db.prepare("SELECT * FROM guide_articles ORDER BY created_at ASC").all();
  return rows.map(rowToArticle);
}

export async function getArticleBySlug(slug) {
  const db = await getDb();
  const row = await db.prepare("SELECT * FROM guide_articles WHERE slug = ?").get(slug);
  return row ? rowToArticle(row) : null;
}

export async function getArticleById(id) {
  const db = await getDb();
  const row = await db.prepare("SELECT * FROM guide_articles WHERE id = ?").get(id);
  return row ? rowToArticle(row) : null;
}

export async function createArticle(input) {
  const db = await getDb();
  const id = newId();
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO guide_articles (id, slug, title, excerpt, content, category, status, published_at, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      id,
      input.slug,
      input.title,
      input.excerpt,
      JSON.stringify(input.body || []),
      input.category || "general",
      input.status || "published",
      input.status === "published" ? now : null,
      now,
      now
    );
  return getArticleById(id);
}

export async function updateArticle(id, patch) {
  const db = await getDb();
  const sets = [];
  const values = [];
  const map = { title: "title", excerpt: "excerpt", category: "category", status: "status" };
  for (const [key, column] of Object.entries(map)) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      sets.push(`${column} = ?`);
      values.push(patch[key]);
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, "body")) {
    sets.push("content = ?");
    values.push(JSON.stringify(patch.body));
  }
  if (patch.status === "published") {
    sets.push("published_at = ?");
    values.push(nowIso());
  }
  if (!sets.length) return getArticleById(id);
  sets.push("updated_at = ?");
  values.push(nowIso());
  values.push(id);
  await db.prepare(`UPDATE guide_articles SET ${sets.join(", ")} WHERE id = ?`).run(...values);
  return getArticleById(id);
}
