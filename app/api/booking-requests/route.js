import { NextResponse } from "next/server";
import { createBooking } from "@/lib/db/bookings";

// Public, unauthenticated endpoint: the real Booking Request MVP (Section
// 10 of the presentation-readiness pass). This is what components/
// BookingFlow.js (the public /book flow) submits to. Unlike
// app/api/bookings/route.js (admin-only, requires a staff session), this
// intentionally has no session check, a real prospective customer is not
// signed in as staff. It creates a REAL row in the same bookings table
// /admin/bookings reads, with status PENDING, so Zebra staff see and can
// act on it immediately, it is not a "lead" or a fake success screen.
//
// No payment is taken or referenced here, this only ever records what the
// customer is asking for. See components/BookingFlow.js's own copy for the
// customer-facing honesty language ("not yet a confirmed booking, no
// payment has been taken").
export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const {
    vehicleDbId,
    pickupDate,
    returnDate,
    pickupLocation,
    dropoffLocation,
    customerName,
    customerEmail,
    customerPhone,
    customerCountry,
    serviceType,
    extraKeys,
  } = body;

  if (!vehicleDbId || !pickupDate || !returnDate) {
    return NextResponse.json({ error: "Vehicle and dates are required." }, { status: 400 });
  }
  if (!customerName?.trim() || !customerEmail?.trim()) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  try {
    // No totalRWF is accepted from the browser here on purpose (see
    // FINAL_FEATURE_AUDIT.md Section 2): createBooking() recomputes the real
    // total itself from the vehicle's published rate and the real, active
    // extras named in extraKeys, an "online_request" booking can never be
    // charged a number the client made up.
    const booking = await createBooking({
      vehicleDbId,
      pickupDate,
      returnDate,
      pickupLocation,
      dropoffLocation,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      customerPhone: customerPhone?.trim() || null,
      customerCountry: customerCountry?.trim() || null,
      serviceType: serviceType || "self-drive",
      extraKeys: Array.isArray(extraKeys) ? extraKeys : [],
      source: "online_request",
    });
    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    // checkAvailability's own real overlap/blocked-date check throws here
    // when the vehicle is no longer free for these dates (see
    // lib/db/bookings.js createBooking()), which is a real conflict, not a
    // malformed request, hence 409 rather than 400.
    const status = /available/i.test(error.message || "") ? 409 : 400;
    return NextResponse.json({ error: error.message || "Could not submit your booking request." }, { status });
  }
}
