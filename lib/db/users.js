// Server-only.
import { getDb, newId, nowIso } from "./client";

export async function getUserByEmail(email) {
  const db = await getDb();
  return (await db.prepare("SELECT * FROM users WHERE email = ?").get(email)) || null;
}

export async function getUserById(id) {
  const db = await getDb();
  return (await db.prepare("SELECT * FROM users WHERE id = ?").get(id)) || null;
}

export async function createUser({ email, passwordHash, name, role }) {
  const db = await getDb();
  const id = newId();
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?)`
    )
    .run(id, email, passwordHash, name, role || "STAFF", now, now);
  return getUserById(id);
}
