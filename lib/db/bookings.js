// Server-only. Admin visibility into bookings (Section 3C). Nothing writes
// to this table yet, the public booking flow (components/BookingFlow.js)
// is still a labelled demo that does not save anywhere, real booking
// creation is Phase 3D and needs a payment provider and the outstanding
// business policy decisions first. This file exists so the admin panel is
// ready the moment real bookings start arriving, not to display fabricated
// ones now.
import { getDb, nowIso } from "./client";

function rowToBooking(row) {
  return {
    id: row.id,
    bookingNumber: row.booking_number,
    vehicleId: row.vehicle_id,
    vehicleName: row.vehicle_name,
    customerId: row.customer_id,
    customerName: row.customer_name,
    pickupDate: row.pickup_date,
    returnDate: row.return_date,
    serviceType: row.service_type,
    status: row.status,
    totalRWF: row.total_rwf,
    depositRWF: row.deposit_rwf,
    isDemo: !!row.is_demo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT = `
  SELECT b.*, v.display_name as vehicle_name, c.name as customer_name
  FROM bookings b
  LEFT JOIN vehicles v ON v.id = b.vehicle_id
  LEFT JOIN customers c ON c.id = b.customer_id
`;

export function getBookings() {
  const rows = getDb().prepare(`${SELECT} ORDER BY b.created_at DESC`).all();
  return rows.map(rowToBooking);
}

export function getBookingById(id) {
  const row = getDb().prepare(`${SELECT} WHERE b.id = ?`).get(id);
  return row ? rowToBooking(row) : null;
}

export function setBookingStatus(id, status) {
  getDb().prepare("UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?").run(status, nowIso(), id);
  return getBookingById(id);
}
