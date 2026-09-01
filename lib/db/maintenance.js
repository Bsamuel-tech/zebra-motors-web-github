// ---------------------------------------------------------------------------
// VEHICLE MAINTENANCE (real service and repair history)
// ---------------------------------------------------------------------------
// Every record here is entered by staff for a real event, no schedule is
// auto-generated and no cost or date is estimated. The one automated
// behavior is syncing the vehicle's own status: moving a record to
// IN_PROGRESS marks the vehicle MAINTENANCE, and closing the last open
// record on a vehicle reverts it to AVAILABLE, mirroring how a real rental
// yard actually works. This never overrides a vehicle status unrelated to
// maintenance (RESERVED, RENTED, UNAVAILABLE, ARCHIVED), see
// closeVehicleMaintenanceStatusIfClear() below.
// ---------------------------------------------------------------------------
import { getDb, newId, nowIso } from "./client";
import { updateVehicle, getVehicleByDbId } from "./vehicles";

function rowToRecord(row) {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    type: row.type,
    description: row.description,
    status: row.status,
    scheduledDate: row.scheduled_date,
    completedDate: row.completed_date,
    costRWF: row.cost_rwf,
    odometerKm: row.odometer_km,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createMaintenanceRecord({ vehicleId, type, description, status, scheduledDate, costRWF, odometerKm, notes }) {
  const db = await getDb();
  const id = newId();
  const now = nowIso();
  const initialStatus = status || "SCHEDULED";
  await db
    .prepare(
      `INSERT INTO vehicle_maintenance
         (id, vehicle_id, type, description, status, scheduled_date, cost_rwf, odometer_km, notes, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      id,
      vehicleId,
      type || "service",
      description || "",
      initialStatus,
      scheduledDate || null,
      costRWF ?? null,
      odometerKm ?? null,
      notes || "",
      now,
      now
    );
  if (initialStatus === "IN_PROGRESS") await setVehicleUnderMaintenance(vehicleId);
  return getMaintenanceRecordById(id);
}

export async function getMaintenanceRecordById(id) {
  const db = await getDb();
  const row = await db.prepare("SELECT * FROM vehicle_maintenance WHERE id = ?").get(id);
  return row ? rowToRecord(row) : null;
}

export async function getMaintenanceRecords(vehicleId) {
  const db = await getDb();
  const rows = await db
    .prepare("SELECT * FROM vehicle_maintenance WHERE vehicle_id = ? ORDER BY created_at DESC")
    .all(vehicleId);
  return rows.map(rowToRecord);
}

// Fleet-wide view for the admin maintenance overview page, joined with the
// vehicle's real name so the list is readable without a second lookup.
export async function getAllMaintenanceRecords() {
  const db = await getDb();
  const rows = await db
    .prepare(
      `SELECT m.*, v.display_name as vehicle_name, v.slug as vehicle_slug
       FROM vehicle_maintenance m JOIN vehicles v ON v.id = m.vehicle_id
       ORDER BY
         CASE m.status WHEN 'IN_PROGRESS' THEN 0 WHEN 'SCHEDULED' THEN 1 WHEN 'DONE' THEN 2 ELSE 3 END,
         m.created_at DESC`
    )
    .all();
  return rows.map((row) => ({ ...rowToRecord(row), vehicleName: row.vehicle_name, vehicleSlug: row.vehicle_slug }));
}

export async function updateMaintenanceRecord(id, { status, completedDate, costRWF, odometerKm, notes }) {
  const db = await getDb();
  const existing = await getMaintenanceRecordById(id);
  if (!existing) return null;

  const sets = [];
  const values = [];
  if (status) {
    sets.push("status = ?");
    values.push(status);
  }
  if (completedDate !== undefined) {
    sets.push("completed_date = ?");
    values.push(completedDate);
  }
  if (costRWF !== undefined) {
    sets.push("cost_rwf = ?");
    values.push(costRWF);
  }
  if (odometerKm !== undefined) {
    sets.push("odometer_km = ?");
    values.push(odometerKm);
  }
  if (notes !== undefined) {
    sets.push("notes = ?");
    values.push(notes);
  }
  if (sets.length) {
    sets.push("updated_at = ?");
    values.push(nowIso());
    values.push(id);
    await db.prepare(`UPDATE vehicle_maintenance SET ${sets.join(", ")} WHERE id = ?`).run(...values);
  }

  if (status === "IN_PROGRESS") {
    await setVehicleUnderMaintenance(existing.vehicleId);
  } else if (status === "DONE" || status === "CANCELLED") {
    await closeVehicleMaintenanceStatusIfClear(existing.vehicleId);
  }

  return getMaintenanceRecordById(id);
}

async function setVehicleUnderMaintenance(vehicleId) {
  const vehicle = await getVehicleByDbId(vehicleId);
  if (!vehicle) return;
  // Only ever move a vehicle INTO maintenance from a state where it makes
  // sense, never override RESERVED/RENTED/UNAVAILABLE/ARCHIVED, staff set
  // those deliberately and a maintenance record should not silently
  // clobber them.
  if (vehicle.status === "AVAILABLE") {
    await updateVehicle(vehicleId, { status: "MAINTENANCE" });
  }
}

async function closeVehicleMaintenanceStatusIfClear(vehicleId) {
  const db = await getDb();
  const stillOpen = (
    await db
      .prepare("SELECT COUNT(*) as c FROM vehicle_maintenance WHERE vehicle_id = ? AND status = 'IN_PROGRESS'")
      .get(vehicleId)
  ).c;
  if (Number(stillOpen) > 0) return;
  const vehicle = await getVehicleByDbId(vehicleId);
  if (vehicle && vehicle.status === "MAINTENANCE") {
    await updateVehicle(vehicleId, { status: "AVAILABLE" });
  }
}

// Real, date-based, not predicted: anything scheduled today or earlier and
// not yet started or finished. Used for the admin dashboard's "needs
// attention" count, never a forecast of future maintenance need.
export async function getUpcomingMaintenance() {
  const db = await getDb();
  const today = new Date().toISOString().slice(0, 10);
  const rows = await db
    .prepare(
      `SELECT m.*, v.display_name as vehicle_name
       FROM vehicle_maintenance m JOIN vehicles v ON v.id = m.vehicle_id
       WHERE m.status = 'SCHEDULED' AND (m.scheduled_date IS NULL OR m.scheduled_date <= ?)
       ORDER BY m.scheduled_date ASC`
    )
    .all(today);
  return rows.map((row) => ({ ...rowToRecord(row), vehicleName: row.vehicle_name }));
}
