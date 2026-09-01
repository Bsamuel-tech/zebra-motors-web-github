// Server-only. Minimal observability for admin actions (Section 71/72).
import { getDb, newId, nowIso } from "./client";

export async function logAction({ userId, action, entityType, entityId, detail }) {
  const db = await getDb();
  await db
    .prepare(
      `INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, detail, created_at)
       VALUES (?,?,?,?,?,?,?)`
    )
    .run(newId(), userId || null, action, entityType, entityId, detail || "", nowIso());
}

export async function getRecentAuditLog(limit = 20) {
  const db = await getDb();
  return db
    .prepare(
      `SELECT audit_log.*, users.name as user_name FROM audit_log
       LEFT JOIN users ON users.id = audit_log.user_id
       ORDER BY audit_log.created_at DESC LIMIT ?`
    )
    .all(limit);
}
