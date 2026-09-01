// Server-only. Real usage tracking for the What If feature (Section 33 of
// the spec): how many people used it, what they asked for, which vehicle
// came out on top, whether they continued to booking. No fake numbers, no
// invented conversion rate, just a count of what actually happened.
import { getDb, newId, nowIso } from "./client";

export async function recordWhatIfSession({ rawInput, scenario, recommendedVehicleId }) {
  const id = newId();
  try {
    const db = await getDb();
    await db
      .prepare(
        `INSERT INTO what_if_sessions (id, raw_input, scenario_json, recommended_vehicle_id, created_at)
         VALUES (?,?,?,?,?)`
      )
      .run(id, rawInput || "", JSON.stringify(scenario || {}), recommendedVehicleId || null, nowIso());
    return id;
  } catch (e) {
    // Analytics must never break the actual feature.
    console.error("recordWhatIfSession failed", e);
    return null;
  }
}

export async function markWhatIfContinued(sessionId) {
  try {
    const db = await getDb();
    await db.prepare("UPDATE what_if_sessions SET clicked_continue = 1 WHERE id = ?").run(sessionId);
  } catch (e) {
    console.error("markWhatIfContinued failed", e);
  }
}

export async function getWhatIfAnalyticsSummary() {
  const db = await getDb();
  const totalSessions = (await db.prepare("SELECT COUNT(*) as c FROM what_if_sessions").get()).c;
  const continued = (await db.prepare("SELECT COUNT(*) as c FROM what_if_sessions WHERE clicked_continue = 1").get()).c;
  const byVehicle = await db
    .prepare(
      `SELECT v.display_name as name, COUNT(*) as count
       FROM what_if_sessions w JOIN vehicles v ON v.id = w.recommended_vehicle_id
       GROUP BY w.recommended_vehicle_id ORDER BY count DESC`
    )
    .all();
  const recent = await db
    .prepare("SELECT raw_input, created_at FROM what_if_sessions ORDER BY created_at DESC LIMIT 10")
    .all();
  return { totalSessions, continued, byVehicle, recent };
}
