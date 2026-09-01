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

export async function createLead({ name, email, phone, message, source, vehicleId }) {
  const db = await getDb();
  const id = newId();
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO leads (id, name, email, phone, message, source, status, vehicle_id, created_at, updated_at)
       VALUES (?,?,?,?,?,?, 'NEW', ?, ?, ?)`
    )
    .run(id, name, email, phone || null, message || "", source || "contact_form", vehicleId || null, now, now);
  return getLeadById(id);
}

export async function getLeads({ status } = {}) {
  const db = await getDb();
  const rows = status
    ? await db.prepare("SELECT * FROM leads WHERE status = ? ORDER BY created_at DESC").all(status)
    : await db.prepare("SELECT * FROM leads ORDER BY created_at DESC").all();
  return rows.map(rowToLead);
}

export async function getLeadById(id) {
  const db = await getDb();
  const row = await db.prepare("SELECT * FROM leads WHERE id = ?").get(id);
  return row ? rowToLead(row) : null;
}

export async function updateLeadStatus(id, { status, adminNotes }) {
  const db = await getDb();
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
  await db.prepare(`UPDATE leads SET ${sets.join(", ")} WHERE id = ?`).run(...values);
  return getLeadById(id);
}

// Converts a lead into a real customer record. If a customer with the same
// email already exists, links to that one rather than creating a
// duplicate, real business data should not be duplicated just because two
// different forms were used.
export async function convertLeadToCustomer(id) {
  const db = await getDb();
  const lead = await getLeadById(id);
  if (!lead) return null;

  let customer = await db.prepare("SELECT * FROM customers WHERE email = ?").get(lead.email);
  if (!customer) {
    const customerId = newId();
    await db
      .prepare(`INSERT INTO customers (id, name, email, phone, created_at) VALUES (?,?,?,?,?)`)
      .run(customerId, lead.name, lead.email, lead.phone || null, nowIso());
    customer = await db.prepare("SELECT * FROM customers WHERE id = ?").get(customerId);
  }

  await db
    .prepare(`UPDATE leads SET status = 'CONVERTED', converted_customer_id = ?, updated_at = ? WHERE id = ?`)
    .run(customer.id, nowIso(), id);

  return { lead: await getLeadById(id), customerId: customer.id };
}

export async function getLeadsSummary() {
  const db = await getDb();
  const byStatus = await db.prepare("SELECT status, COUNT(*) as c FROM leads GROUP BY status").all();
  const total = byStatus.reduce((sum, row) => sum + Number(row.c), 0);
  const counts = { NEW: 0, CONTACTED: 0, CONVERTED: 0, LOST: 0 };
  for (const row of byStatus) counts[row.status] = Number(row.c);
  return { total, counts };
}
