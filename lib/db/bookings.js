// Server-only. Admin visibility into bookings (Section 3C), real booking
// creation, and trip usage tracking (P3). A row here can come from two
// places, distinguished by `source`: 'staff_entered' (Zebra staff recording
// a booking taken by phone or in person, via /admin/bookings/new) or
// 'online_request' (a real customer submitting the public /book flow
// themselves, see app/api/booking-requests/route.js, Section 10 of the
// presentation-readiness pass). Both end up as real, non-demo rows here
// (is_demo = 0), starting at status PENDING until staff confirm them. No
// payment is taken or referenced for either, that is still a separate,
// unbuilt piece of work (Section 11).
import { getDb, newId, nowIso } from "./client";
import { getVehicleByDbId } from "./vehicles";
import { getExtraByKey } from "./extras";
import { checkAvailability } from "./availability";
import { midRateRWF } from "@/data/vehicles";

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
    pickupLocation: row.pickup_location,
    dropoffLocation: row.dropoff_location,
    serviceType: row.service_type,
    status: row.status,
    source: row.source || "staff_entered",
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

function rowToBookingExtra(row) {
  return {
    id: row.id,
    bookingId: row.booking_id,
    extraKey: row.extra_key,
    name: row.name,
    pricingType: row.pricing_type,
    priceRWF: row.price_rwf,
    amountRWF: row.amount_rwf,
  };
}

export async function getBookingExtras(bookingId) {
  const db = await getDb();
  const rows = await db
    .prepare("SELECT * FROM booking_extras WHERE booking_id = ? ORDER BY created_at ASC")
    .all(bookingId);
  return rows.map(rowToBookingExtra);
}

// Same rounding rule as components/BookingFlow.js computeDuration() and
// lib/ai/tools.js billableDaysBetween(): any part of a day counts as a full
// rental day. Kept in this third place deliberately (not imported from
// either, one is a client component, the other a separate module with no
// shared server-only utils file today) but must stay byte-for-byte
// identical, since this is now the version that actually decides what a
// customer is charged.
function billableDaysBetween(pickupDate, returnDate) {
  const diffMs = new Date(returnDate).getTime() - new Date(pickupDate).getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return 1;
  return Math.max(1, Math.ceil(diffMs / 86400000));
}

// Recomputes the real total from the vehicle's own published rate and the
// real, currently-active extras the customer selected, ignoring whatever
// number a browser might send. This is what closes the price-integrity gap
// FINAL_FEATURE_AUDIT.md Section 2 found: "the booking API trusts whatever
// totalRWF the browser sends rather than recomputing it server side". Only
// PER_DAY and PER_BOOKING extras have a fixed price to add to the total;
// CUSTOM_QUOTE and PER_KM extras are recorded (see createBooking) but never
// summed, Zebra prices those directly, exactly like the booking form itself
// never adds them to its on-screen total.
async function priceBooking({ vehicle, pickupDate, returnDate, extraKeys }) {
  const billableDays = billableDaysBetween(pickupDate, returnDate);
  const vehicleTotal = midRateRWF(vehicle) * billableDays;
  const extraRows = [];
  let extrasTotal = 0;
  for (const key of extraKeys || []) {
    const extra = await getExtraByKey(key);
    if (!extra || !extra.active) continue; // never trust an extra key the client invents or one Zebra turned off
    let amountRWF = null;
    if (extra.pricingType === "PER_DAY" && Number.isFinite(extra.priceRWF)) {
      amountRWF = extra.priceRWF * billableDays;
      extrasTotal += amountRWF;
    } else if (extra.pricingType === "PER_BOOKING" && Number.isFinite(extra.priceRWF)) {
      amountRWF = extra.priceRWF;
      extrasTotal += amountRWF;
    }
    extraRows.push({ extraKey: extra.key, name: extra.name, pricingType: extra.pricingType, priceRWF: extra.priceRWF, amountRWF });
  }
  return { billableDays, totalRWF: vehicleTotal + extrasTotal, extraRows };
}

const SELECT = `
  SELECT b.*, v.display_name as vehicle_name, c.name as customer_name
  FROM bookings b
  LEFT JOIN vehicles v ON v.id = b.vehicle_id
  LEFT JOIN customers c ON c.id = b.customer_id
`;

export async function getBookings() {
  const db = await getDb();
  const rows = await db.prepare(`${SELECT} ORDER BY b.created_at DESC`).all();
  return rows.map(rowToBooking);
}

export async function getBookingById(id) {
  const db = await getDb();
  const row = await db.prepare(`${SELECT} WHERE b.id = ?`).get(id);
  return row ? rowToBooking(row) : null;
}

export async function setBookingStatus(id, status) {
  const db = await getDb();
  await db.prepare("UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?").run(status, nowIso(), id);
  return getBookingById(id);
}

async function generateBookingNumber(db) {
  // Human-readable and unique, not meant to be secret. Collisions are
  // vanishingly unlikely (a date stamp plus a random 4-digit suffix), but
  // this still checks and retries rather than assuming.
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const stamp = nowIso().slice(0, 10).replace(/-/g, "");
    const suffix = String(Math.floor(1000 + Math.random() * 9000));
    const candidate = `ZM-${stamp}-${suffix}`;
    const exists = await db.prepare("SELECT id FROM bookings WHERE booking_number = ?").get(candidate);
    if (!exists) return candidate;
  }
  throw new Error("Could not generate a unique booking number.");
}

// Creates a real booking row, either staff-entered or a real customer's own
// online request (see the module comment above for the `source` values).
// Always created as a real booking (is_demo = 0), find-or-create on the
// customer's email (case-insensitive), the same pattern
// convertLeadToCustomer() already uses in leads.js so a customer is never
// duplicated just because they came through a different door.
//
// Price and availability trust boundary (FINAL_FEATURE_AUDIT.md Sections 2
// and 3): a 'staff_entered' booking keeps trusting input.totalRWF, a staff
// member taking a call may have negotiated a real, non-standard price and
// there is no browser in between to distrust. An 'online_request' or
// 'ai_assistant' booking is public-facing, so its total is always
// recomputed from the real vehicle rate and real active extras
// (priceBooking()) and any totalRWF the caller sent is ignored outright,
// and its dates are checked against real availability before the row is
// written, so two customers can no longer both "win" the same vehicle for
// overlapping dates with neither being told.
export async function createBooking(input) {
  if (!input?.vehicleDbId) throw new Error("vehicleDbId is required.");
  if (!input?.pickupDate || !input?.returnDate) throw new Error("pickupDate and returnDate are required.");
  if (!input?.customerName || !input?.customerEmail) throw new Error("customerName and customerEmail are required.");

  const isPublicSource = input.source === "online_request" || input.source === "ai_assistant";

  let totalRWF = Number(input.totalRWF);
  let extraRows = [];

  if (isPublicSource) {
    const vehicle = await getVehicleByDbId(input.vehicleDbId);
    if (!vehicle) throw new Error("Vehicle not found.");

    const availability = await checkAvailability(input.vehicleDbId, input.pickupDate, input.returnDate);
    if (availability.checked && availability.available === false) {
      throw new Error(availability.reason || "This vehicle is no longer available for these dates.");
    }

    const priced = await priceBooking({
      vehicle,
      pickupDate: input.pickupDate,
      returnDate: input.returnDate,
      extraKeys: input.extraKeys,
    });
    totalRWF = priced.totalRWF;
    extraRows = priced.extraRows;
  } else if (!Number.isFinite(totalRWF)) {
    throw new Error("totalRWF is required.");
  }

  const db = await getDb();
  const normalizedEmail = input.customerEmail.trim().toLowerCase();
  let customer = await db.prepare("SELECT * FROM customers WHERE lower(email) = ?").get(normalizedEmail);
  if (!customer) {
    const customerId = newId();
    await db
      .prepare(`INSERT INTO customers (id, name, email, phone, country, created_at) VALUES (?,?,?,?,?,?)`)
      .run(
        customerId,
        input.customerName,
        normalizedEmail,
        input.customerPhone || null,
        input.customerCountry || null,
        nowIso()
      );
    customer = await db.prepare("SELECT * FROM customers WHERE id = ?").get(customerId);
  }

  const id = newId();
  const now = nowIso();
  const bookingNumber = await generateBookingNumber(db);
  await db
    .prepare(
      `INSERT INTO bookings
        (id, booking_number, vehicle_id, customer_id, pickup_date, return_date, pickup_location,
         dropoff_location, service_type, status, source, total_rwf, deposit_rwf, is_demo,
         planned_distance_km, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,?)`
    )
    .run(
      id,
      bookingNumber,
      input.vehicleDbId,
      customer.id,
      input.pickupDate,
      input.returnDate,
      input.pickupLocation?.trim() || null,
      input.dropoffLocation?.trim() || null,
      input.serviceType || "self-drive",
      "PENDING",
      // "ai_assistant" added alongside the existing two values so the admin
      // bookings list and Zebra AI Support (lib/ai/tools.js) can both be
      // honest about where a request actually came from, still always
      // PENDING either way, an AI tool call is never allowed to confirm a
      // booking, only create the same kind of request a human staff member
      // would still need to review.
      ["online_request", "ai_assistant"].includes(input.source) ? input.source : "staff_entered",
      totalRWF,
      input.depositRWF != null ? Number(input.depositRWF) : null,
      // Only ever a real distance from an actual routed trip (see
      // lib/geo/provider.js), never estimated, left null otherwise.
      Number.isFinite(input.plannedDistanceKm) ? Math.round(input.plannedDistanceKm) : null,
      now,
      now
    );

  for (const extra of extraRows) {
    await db
      .prepare(
        `INSERT INTO booking_extras (id, booking_id, extra_key, name, pricing_type, price_rwf, amount_rwf, created_at)
         VALUES (?,?,?,?,?,?,?,?)`
      )
      .run(newId(), id, extra.extraKey, extra.name, extra.pricingType, extra.priceRWF ?? null, extra.amountRWF ?? null, now);
  }

  return getBookingById(id);
}

// Real pickup/return odometer readings, recorded by staff at vehicle
// handover and return, never estimated. Either can be recorded on its own
// (pickup usually happens well before return).
export async function recordOdometer(id, { pickupOdometerKm, returnOdometerKm } = {}) {
  const db = await getDb();
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
  await db.prepare(`UPDATE bookings SET ${sets.join(", ")} WHERE id = ?`).run(...values);
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
// it never fills a gap with a guess (Rule 2). Synchronous on purpose, it
// takes already-loaded booking/vehicle objects rather than querying itself.
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
