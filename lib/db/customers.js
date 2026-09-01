// Server-only. Customer records: admin visibility (Section 3C) plus real
// customer self-service accounts (Section 7/8, customer authentication
// Option A). A row here can come from three places: an admin-entered
// booking (lib/db/bookings.js createBooking), a converted lead
// (lib/db/leads.js convertLeadToCustomer), or a real customer signing up
// through /login (createCustomerAccount below). password_hash is null for
// the first two until that same email signs up, at which point the
// existing row is claimed rather than duplicated.
import { getDb, newId, nowIso } from "./client";

function rowToCustomer(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    country: row.country,
    createdAt: row.created_at,
  };
}

export async function getCustomers() {
  const db = await getDb();
  const rows = await db.prepare("SELECT * FROM customers ORDER BY created_at DESC").all();
  return rows.map(rowToCustomer);
}

export async function getCustomerById(id) {
  const db = await getDb();
  const row = await db.prepare("SELECT * FROM customers WHERE id = ?").get(id);
  return row ? rowToCustomer(row) : null;
}

export async function getBookingsForCustomer(customerId) {
  const db = await getDb();
  const rows = await db
    .prepare(
      `SELECT b.*, v.display_name as vehicle_name
       FROM bookings b LEFT JOIN vehicles v ON v.id = b.vehicle_id
       WHERE b.customer_id = ? ORDER BY b.created_at DESC`
    )
    .all(customerId);
  return rows;
}

// Raw row, including password_hash, used only by the customer-auth API
// routes (app/api/customer-auth/*) to check a submitted password. Never
// expose this outside those routes, everywhere else use getCustomerById /
// getCustomers, which never return password_hash.
export async function getCustomerAuthRecordByEmail(email) {
  const db = await getDb();
  const normalized = (email || "").trim().toLowerCase();
  if (!normalized) return null;
  return (await db.prepare("SELECT * FROM customers WHERE lower(email) = ?").get(normalized)) || null;
}

// Real self-service signup. If a customer row already exists at this email
// (created earlier by staff entering a phone booking, or a converted lead),
// this claims that row rather than creating a duplicate, the same
// find-or-create principle already used in bookings.js and leads.js. If
// that existing row already has a password set, this refuses, the caller
// (the signup API route) should tell the visitor to sign in instead.
export async function createCustomerAccount({ name, email, phone, passwordHash }) {
  const db = await getDb();
  const normalized = (email || "").trim().toLowerCase();
  if (!normalized || !name || !passwordHash) {
    throw new Error("name, email, and passwordHash are required.");
  }
  const existing = await db.prepare("SELECT * FROM customers WHERE lower(email) = ?").get(normalized);
  if (existing) {
    if (existing.password_hash) {
      const err = new Error("An account already exists for this email.");
      err.code = "ACCOUNT_EXISTS";
      throw err;
    }
    await db
      .prepare("UPDATE customers SET name = ?, phone = COALESCE(?, phone), password_hash = ? WHERE id = ?")
      .run(name, phone || null, passwordHash, existing.id);
    return getCustomerById(existing.id);
  }
  const id = newId();
  await db
    .prepare(
      `INSERT INTO customers (id, name, email, phone, password_hash, created_at) VALUES (?,?,?,?,?,?)`
    )
    .run(id, name, normalized, phone || null, passwordHash, nowIso());
  return getCustomerById(id);
}
