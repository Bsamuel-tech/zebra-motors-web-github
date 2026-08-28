// Server-only.
import { getDb, newId, nowIso } from "./client";

export function getUserByEmail(email) {
  return getDb().prepare("SELECT * FROM users WHERE email = ?").get(email) || null;
}

export function getUserById(id) {
  return getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) || null;
}

export function createUser({ email, passwordHash, name, role }) {
  const db = getDb();
  const id = newId();
  const now = nowIso();
  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?)`
  ).run(id, email, passwordHash, name, role || "STAFF", now, now);
  return getUserById(id);
}
