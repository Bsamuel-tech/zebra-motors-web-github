// Server-only. FAQ content management (Section 14).
import { getDb, newId, nowIso } from "./client";

function rowToFaq(row) {
  return {
    id: row.id,
    q: row.question,
    a: row.answer,
    category: row.category,
    published: !!row.published,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getFaqs({ publishedOnly = false } = {}) {
  const db = getDb();
  const rows = publishedOnly
    ? db.prepare("SELECT * FROM faqs WHERE published = 1 ORDER BY sort_order ASC, created_at ASC").all()
    : db.prepare("SELECT * FROM faqs ORDER BY sort_order ASC, created_at ASC").all();
  return rows.map(rowToFaq);
}

export function createFaq({ question, answer, category = "general", sortOrder = 0 }) {
  const db = getDb();
  const id = newId();
  const now = nowIso();
  db.prepare(
    `INSERT INTO faqs (id, question, answer, category, published, sort_order, created_at, updated_at)
     VALUES (?,?,?,?,1,?,?,?)`
  ).run(id, question, answer, category, sortOrder, now, now);
  return getFaqs().find((f) => f.id === id);
}

export function updateFaq(id, patch) {
  const db = getDb();
  const sets = [];
  const values = [];
  const map = { q: "question", a: "answer", category: "category", sortOrder: "sort_order" };
  for (const [key, column] of Object.entries(map)) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      sets.push(`${column} = ?`);
      values.push(patch[key]);
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, "published")) {
    sets.push("published = ?");
    values.push(patch.published ? 1 : 0);
  }
  if (!sets.length) return getFaqs().find((f) => f.id === id);
  sets.push("updated_at = ?");
  values.push(nowIso());
  values.push(id);
  db.prepare(`UPDATE faqs SET ${sets.join(", ")} WHERE id = ?`).run(...values);
  return getFaqs().find((f) => f.id === id);
}

export function deleteFaq(id) {
  getDb().prepare("DELETE FROM faqs WHERE id = ?").run(id);
}
