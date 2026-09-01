// ---------------------------------------------------------------------------
// AVAILABILITY (real check, no hallucination)
// ---------------------------------------------------------------------------
// Server-only. Checks a vehicle's real availability for a date range against
// two real tables: vehicle_availability (admin-blocked ranges, e.g.
// maintenance) and bookings (real, non-demo, non-cancelled bookings). Demo
// bookings (is_demo = 1, the labelled public booking flow that does not
// really save anywhere yet) are excluded on purpose, they are not a real
// commitment and must not block a real customer's real date range.
//
// This never guesses. If dates are not provided, callers should not call
// this at all and should say so, per the platform's rule against
// hallucinating availability.
// ---------------------------------------------------------------------------
import { getDb } from "./client";

export async function checkAvailability(vehicleId, pickupDate, returnDate) {
  if (!vehicleId || !pickupDate || !returnDate) {
    return { checked: false, available: null, reason: "No dates provided, availability was not checked." };
  }
  const db = await getDb();

  const blocked = await db
    .prepare(
      `SELECT reason FROM vehicle_availability
       WHERE vehicle_id = ? AND start_date <= ? AND end_date >= ?`
    )
    .get(vehicleId, returnDate, pickupDate);
  if (blocked) {
    return { checked: true, available: false, reason: blocked.reason || "Not available for these dates." };
  }

  const overlapping = await db
    .prepare(
      `SELECT id FROM bookings
       WHERE vehicle_id = ? AND is_demo = 0 AND status != 'CANCELLED'
       AND pickup_date <= ? AND return_date >= ?`
    )
    .get(vehicleId, returnDate, pickupDate);
  if (overlapping) {
    return { checked: true, available: false, reason: "Already booked for part of these dates." };
  }

  return { checked: true, available: true, reason: "Available for these dates." };
}
