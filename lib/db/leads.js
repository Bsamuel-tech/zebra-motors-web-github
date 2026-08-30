// ---------------------------------------------------------------------------
// LEADS (real prospective-customer records)
// ---------------------------------------------------------------------------
// The top of Zebra's real customer pipeline. A lead is only ever created
// from an actual visitor action, currently the public contact form, never
// invented or backfilled. Distinct from lib/db/customers.js, which stays
// empty until a real booking exists (Phase 3D), a lead can exist long
// before any booking does, that is the point of tracking it.
// ---------------------------------------------------------------------------
import { getDb, newId, nowIso } from "./client";

function rowToLead(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    message: row.message,
    source: row.source,
    status: row.status,
    vehicleId: row.vehicle_id,
    convertedCustomerId: row.converted_customer_id,
    adminNotes: row.admin_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createLead({ name, email, phone, message, source, vehicleId }) {
  const db = getDb();
  const id = newId();
  const now = nowIso();
  db.prepare(
    `INSERT INTO leads (id, name, email, phone, message, source, status, vehicle_id, created_at, updated_at)
     VALUES (?,?,?,?,?,?, 'NEW', ?, ?, ?)`
  ).run(id, name, email, phone || null, message || "", source || "contact_form", vehicleId || null, now, now);
  return getLeadById(id);
}

export function getLeads({ status } = {}) {
  const db = getDb();
  const rows = status
    ? db.prepare("SELECT * FROM leads WHERE status = ? ORDER BY created_at DESC").all(status)
    : db.prepare("SELECT * FROM leads ORDER BY created_at DESC").all();
  return rows.map(rowToLead);
}

export function getLeadById(id) {
  const row = getDb().prepare("SELECT * FROM leads WHERE id = ?").get(id);
  return row ? rowToLead(row) : null;
}

export function updateLeadStatus(id, { status, adminNotes }) {
  const db = getDb();
  const sets = [];
  const values = [];
  if (status) {
    sets.push("status = ?");
    values.push(status);
  }
  if (adminNotes !== undefined) {
    sets.push("admin_notes = ?");
    values.push(adminNotes);
  }
  if (!sets.length) return getLeadById(id);
  sets.push("updated_at = ?");
  values.push(nowIso());
  values.push(id);
  db.prepare(`UPDATE leads SET ${sets.join(", ")} WHERE id = ?`).run(...values);
  return getLeadById(id);
}

// Converts a lead into a real customer record. If a customer with the same
// email already exists, links to that one rather than creating a
// duplicate, real business data should not be duplicated just because two
// different forms were used.
export function convertLeadToCustomer(id) {
  const db = getDb();
  const lead = getLeadById(id);
  if (!lead) return null;

  let customer = db.prepare("SELECT * FROM customers WHERE email = ?").get(lead.email);
  if (!customer) {
    const customerId = newId();
    db.prepare(
      `INSERT INTO customers (id, name, email, phone, created_at) VALUES (?,?,?,?,?)`
    ).run(customerId, lead.name, lead.email, lead.phone || null, nowIso());
    customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(customerId);
  }

  db.prepare(
    `UPDATE leads SET status = 'CONVERTED', converted_customer_id = ?, updated_at = ? WHERE id = ?`
  ).run(customer.id, nowIso(), id);

  return { lead: getLeadById(id), customerId: customer.id };
}

export function getLeadsSummary() {
  const db = getDb();
  const byStatus = db.prepare("SELECT status, COUNT(*) as c FROM leads GROUP BY status").all();
  const total = byStatus.reduce((sum, row) => sum + row.c, 0);
  const counts = { NEW: 0, CONTACTED: 0, CONVERTED: 0, LOST: 0 };
  for (const row of byStatus) counts[row.status] = row.c;
  return { total, counts };
}
