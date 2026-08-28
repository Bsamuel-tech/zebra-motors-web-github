// Server-only. Admin visibility into customer records (Section 3C). Like
// bookings.js, this table is only ever populated by a real booking, which
// does not exist yet (Phase 3D). Empty here is the honest, correct state
// right now, not a bug.
import { getDb } from "./client";

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

export function getCustomers() {
  const rows = getDb().prepare("SELECT * FROM customers ORDER BY created_at DESC").all();
  return rows.map(rowToCustomer);
}

export function getCustomerById(id) {
  const row = getDb().prepare("SELECT * FROM customers WHERE id = ?").get(id);
  return row ? rowToCustomer(row) : null;
}

export function getBookingsForCustomer(customerId) {
  const rows = getDb()
    .prepare(
      `SELECT b.*, v.display_name as vehicle_name
       FROM bookings b LEFT JOIN vehicles v ON v.id = b.vehicle_id
       WHERE b.customer_id = ? ORDER BY b.created_at DESC`
    )
    .all(customerId);
  return rows;
}
