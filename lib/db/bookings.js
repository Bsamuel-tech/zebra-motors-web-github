// Server-only. Admin visibility into bookings (Section 3C), plus real
// admin-entered booking creation and trip usage tracking (P3). The public
// booking flow (components/BookingFlow.js) still only submits a lead, it
// does not create a row here, real customer self-checkout still needs a
// payment provider and the outstanding business policy decisions
// (deposit, cancellation, insurance). What P3 adds is a way for Zebra
// staff to record a real booking they took by phone/in person, and to
// track its real mileage usage, without waiting on that payment work.
import { getDb, newId, nowIso } from "./client";

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
    pickupOdometerKm: row.pickup_odometer_km,
    returnOdometerKm: row.return_odometer_km,
    plannedDistanceKm: row.planned_distance_km,
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

function generateBookingNumber(db) {
  // Human-readable and unique, not meant to be secret. Collisions are
  // vanishingly unlikely (a date stamp plus a random 4-digit suffix), but
  // this still checks and retries rather than assuming.
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const stamp = nowIso().slice(0, 10).replace(/-/g, "");
    const suffix = String(Math.floor(1000 + Math.random() * 9000));
    const candidate = `ZM-${stamp}-${suffix}`;
    const exists = db.prepare("SELECT id FROM bookings WHERE booking_number = ?").get(candidate);
    if (!exists) return candidate;
  }
  throw new Error("Could not generate a unique booking number.");
}

// Real, staff-entered booking (e.g. taken by phone or in person), not the
// public self-checkout flow, which is still lead-only. Always created as
// a real booking (is_demo = 0), find-or-create on the customer's email,
// the same pattern convertLeadToCustomer() already uses in leads.js so a
// customer is never duplicated just because they came through a
// different door.
export function createBooking(input) {
  if (!input?.vehicleDbId) throw new Error("vehicleDbId is required.");
  if (!input?.pickupDate || !input?.returnDate) throw new Error("pickupDate and returnDate are required.");
  if (!input?.customerName || !input?.customerEmail) throw new Error("customerName and customerEmail are required.");
  if (!Number.isFinite(Number(input.totalRWF))) throw new Error("totalRWF is required.");

  const db = getDb();
  let customer = db.prepare("SELECT * FROM customers WHERE email = ?").get(input.customerEmail);
  if (!customer) {
    const customerId = newId();
    db.prepare(`INSERT INTO customers (id, name, email, phone, country, created_at) VALUES (?,?,?,?,?,?)`).run(
      customerId,
      input.customerName,
      input.customerEmail,
      input.customerPhone || null,
      input.customerCountry || null,
      nowIso()
    );
    customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(customerId);
  }

  const id = newId();
  const now = nowIso();
  const bookingNumber = generateBookingNumber(db);
  db.prepare(
    `INSERT INTO bookings
      (id, booking_number, vehicle_id, customer_id, pickup_date, return_date, service_type,
       status, total_rwf, deposit_rwf, is_demo, planned_distance_km, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,0,?,?,?)`
  ).run(
    id,
    bookingNumber,
    input.vehicleDbId,
    customer.id,
    input.pickupDate,
    input.returnDate,
    input.serviceType || "self-drive",
    "PENDING",
    Number(input.totalRWF),
    input.depositRWF != null ? Number(input.depositRWF) : null,
    // Only ever a real distance from an actual routed trip (see
    // lib/geo/provider.js), never estimated, left null otherwise.
    Number.isFinite(input.plannedDistanceKm) ? Math.round(input.plannedDistanceKm) : null,
    now,
    now
  );
  return getBookingById(id);
}

// Real pickup/return odometer readings, recorded by staff at vehicle
// handover and return, never estimated. Either can be recorded on its own
// (pickup usually happens well before return).
export function recordOdometer(id, { pickupOdometerKm, returnOdometerKm } = {}) {
  const db = getDb();
  const sets = [];
  const values = [];
  if (pickupOdometerKm !== undefined) {
    sets.push("pickup_odometer_km = ?");
    values.push(pickupOdometerKm === null ? null : Number(pickupOdometerKm));
  }
  if (returnOdometerKm !== undefined) {
    sets.push("return_odometer_km = ?");
    values.push(returnOdometerKm === null ? null : Number(returnOdometerKm));
  }
  if (!sets.length) return getBookingById(id);
  sets.push("updated_at = ?");
  values.push(nowIso());
  values.push(id);
  db.prepare(`UPDATE bookings SET ${sets.join(", ")} WHERE id = ?`).run(...values);
  return getBookingById(id);
}

function daysBetween(pickupDate, returnDate) {
  const start = new Date(pickupDate);
  const end = new Date(returnDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

// Compares a booking's real recorded odometer usage against the real
// vehicle's mileage policy. Every branch either returns a number computed
// from real recorded data, or an honest reason it could not be computed,
// it never fills a gap with a guess (Rule 2).
export function getMileageUsage(booking, vehicle) {
  if (!booking || !vehicle) return { available: false, reason: "Booking or vehicle not found." };
  if (!Number.isFinite(booking.pickupOdometerKm) || !Number.isFinite(booking.returnOdometerKm)) {
    return { available: false, reason: "Pickup and return odometer readings have not both been recorded yet." };
  }
  const actualKm = booking.returnOdometerKm - booking.pickupOdometerKm;
  if (actualKm < 0) {
    return { available: false, reason: "Return odometer reading is lower than the pickup reading, check the entries." };
  }

  const policyType = vehicle.mileagePolicyType || "UNLIMITED";
  if (policyType === "UNLIMITED") {
    return { available: true, policyType, actualKm, allowedKm: null, overageKm: 0, overageCostRWF: 0 };
  }

  if (policyType === "DAILY_ALLOWANCE") {
    if (!Number.isFinite(vehicle.includedKmPerDay)) {
      return { available: false, reason: "This vehicle's daily mileage allowance has not been set yet (NOT YET CONFIGURED)." };
    }
    const rentalDays = daysBetween(booking.pickupDate, booking.returnDate);
    if (!rentalDays) {
      return { available: false, reason: "Could not determine rental length from the booking's dates." };
    }
    const allowedKm = vehicle.includedKmPerDay * rentalDays;
    const overageKm = Math.max(0, actualKm - allowedKm);
    const overageCostRWF = overageKm > 0 && Number.isFinite(vehicle.extraKmRateRWF) ? overageKm * vehicle.extraKmRateRWF : overageKm > 0 ? null : 0;
    return { available: true, policyType, actualKm, allowedKm, overageKm, overageCostRWF, rentalDays };
  }

  if (policyType === "TOTAL_ALLOWANCE") {
    if (!Number.isFinite(vehicle.includedTotalKm)) {
      return { available: false, reason: "This vehicle's total mileage allowance has not been set yet (NOT YET CONFIGURED)." };
    }
    const allowedKm = vehicle.includedTotalKm;
    const overageKm = Math.max(0, actualKm - allowedKm);
    const overageCostRWF = overageKm > 0 && Number.isFinite(vehicle.extraKmRateRWF) ? overageKm * vehicle.extraKmRateRWF : overageKm > 0 ? null : 0;
    return { available: true, policyType, actualKm, allowedKm, overageKm, overageCostRWF };
  }

  return { available: false, reason: `Unrecognized mileage policy type "${policyType}".` };
}
