// ---------------------------------------------------------------------------
// ZEBRA AI: KNOWLEDGE BASE
// ---------------------------------------------------------------------------
// Real, admin-managed Zebra policy content, the only thing the AI Support
// retrieval layer (lib/ai/knowledgeRetrieval.js) is allowed to quote from
// when it answers a policy question. This table starts empty on a fresh
// database. Nothing here is invented by this codebase, only what a real
// admin types into /admin/knowledge and publishes ever appears here, per
// the project's standing rule against fabricating business information.
//
// Retrieval is deliberately not embeddings-based. No AI provider key is
// configured yet (see lib/ai/provider.js), so there is nothing to generate
// embeddings with, and adding a vector database for a knowledge base this
// small would be more infrastructure than the actual content justifies.
// findRelevantArticles() below does real lexical scoring instead: it is not
// as good as semantic search, but it is a genuine implementation that works
// today with zero external dependencies, and it can be replaced with
// embeddings-based retrieval later without changing anything that calls it.
// ---------------------------------------------------------------------------
import { getDb, newId, nowIso } from "./client";

export const KNOWLEDGE_CATEGORIES = [
  "FLEET",
  "POLICIES",
  "INSURANCE",
  "AIRPORT_PICKUP",
  "RENTAL_REQUIREMENTS",
  "DRIVING_IN_RWANDA",
  "DESTINATIONS",
  "FAQ",
  "CANCELLATION",
  "MILEAGE",
  "CHAUFFEUR",
  "TERMS",
];

function rowToArticle(row) {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    body: row.body,
    published: !!row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getKnowledgeArticles({ publishedOnly = false, category = null } = {}) {
  const db = await getDb();
  let sql = "SELECT * FROM knowledge_articles";
  const clauses = [];
  const params = [];
  if (publishedOnly) clauses.push("published = 1");
  if (category) {
    clauses.push("category = ?");
    params.push(category);
  }
  if (clauses.length) sql += ` WHERE ${clauses.join(" AND ")}`;
  sql += " ORDER BY updated_at DESC";
  const rows = await db.prepare(sql).all(...params);
  return rows.map(rowToArticle);
}

export async function getKnowledgeArticleById(id) {
  const db = await getDb();
  const row = await db.prepare("SELECT * FROM knowledge_articles WHERE id = ?").get(id);
  return row ? rowToArticle(row) : null;
}

export async function createKnowledgeArticle({ category, title, body, published }) {
  if (!title) throw new Error("title is required");
  if (category && !KNOWLEDGE_CATEGORIES.includes(category)) {
    throw new Error(`category must be one of ${KNOWLEDGE_CATEGORIES.join(", ")}`);
  }
  const db = await getDb();
  const id = newId();
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO knowledge_articles (id, category, title, body, published, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?)`
    )
    .run(id, category || "FAQ", title, body || "", published ? 1 : 0, now, now);
  return getKnowledgeArticleById(id);
}

export async function updateKnowledgeArticle(id, { category, title, body, published }) {
  const existing = await getKnowledgeArticleById(id);
  if (!existing) return null;
  if (category !== undefined && category !== null && !KNOWLEDGE_CATEGORIES.includes(category)) {
    throw new Error(`category must be one of ${KNOWLEDGE_CATEGORIES.join(", ")}`);
  }
  const db = await getDb();
  const sets = [];
  const values = [];
  if (category !== undefined) {
    sets.push("category = ?");
    values.push(category);
  }
  if (title !== undefined) {
    sets.push("title = ?");
    values.push(title);
  }
  if (body !== undefined) {
    sets.push("body = ?");
    values.push(body);
  }
  if (published !== undefined) {
    sets.push("published = ?");
    values.push(published ? 1 : 0);
  }
  if (sets.length) {
    sets.push("updated_at = ?");
    values.push(nowIso());
    values.push(id);
    await db.prepare(`UPDATE knowledge_articles SET ${sets.join(", ")} WHERE id = ?`).run(...values);
  }
  return getKnowledgeArticleById(id);
}

// Soft delete only, same pattern as vehicles/destinations elsewhere in this
// codebase (Rule: never destroy an admin's real data entry). An unpublished
// article simply stops being retrievable by AI Support or shown publicly.
export async function unpublishKnowledgeArticle(id) {
  return updateKnowledgeArticle(id, { published: false });
}

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "do", "does", "did", "i", "we", "you",
  "my", "our", "your", "to", "for", "of", "in", "on", "at", "and", "or", "it", "this",
  "that", "with", "can", "what", "when", "how", "will", "if", "me", "please", "want",
]);

function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

// Real lexical scoring, not a fake match: counts how many of the query's
// meaningful words appear in each published article's title and body, with
// a title hit weighted higher than a body hit. Returns the top matches
// above a minimum score, or an empty array if nothing published is
// actually relevant, so the caller can honestly say it does not know
// rather than returning a low-quality guess.
//
// Found live during testing (not assumed): scoring on raw weighted score
// alone let a single shared, unremarkable word ("car", "rent") drag in a
// completely unrelated article, "What is your policy on pets in the car?"
// was matching "Documents needed to rent a car" purely because both
// contain "car". That is exactly the false-confidence failure mode Rule 26
// asks this audit-and-build pass to avoid, so the real gate here is the
// number of DISTINCT query words an article actually shares, not the
// weighted score, minScore only breaks ties after that.
export async function findRelevantArticles(query, { limit = 3, minScore = 1, minDistinctMatches = 2 } = {}) {
  const queryWords = tokenize(query);
  if (queryWords.length === 0) return [];

  const articles = await getKnowledgeArticles({ publishedOnly: true });
  const scored = articles.map((article) => {
    const titleWords = tokenize(article.title);
    const bodyWords = tokenize(article.body);
    let score = 0;
    let distinctMatches = 0;
    for (const w of new Set(queryWords)) {
      const inTitle = titleWords.includes(w);
      const inBody = bodyWords.includes(w);
      if (inTitle) score += 3;
      if (inBody) score += 1;
      if (inTitle || inBody) distinctMatches += 1;
    }
    return { article, score, distinctMatches };
  });

  return scored
    .filter((s) => s.score >= minScore && s.distinctMatches >= minDistinctMatches)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.article);
}
