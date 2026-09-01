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
    customerName,
    customerEmail,
    customerPhone,
    customerCountry,
    serviceType,
    totalRWF,
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
  if (!Number.isFinite(Number(totalRWF))) {
    return NextResponse.json({ error: "Could not determine a rental total, choose valid dates and try again." }, { status: 400 });
  }

  try {
    const booking = await createBooking({
      vehicleDbId,
      pickupDate,
      returnDate,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      customerPhone: customerPhone?.trim() || null,
      customerCountry: customerCountry?.trim() || null,
      serviceType: serviceType || "self-drive",
      totalRWF: Number(totalRWF),
      source: "online_request",
      // notes isn't a real bookings column (see prisma/schema.sql), the
      // request's extras/payment-preference detail lives only in this API
      // response and the confirmation screen for now, not persisted
      // separately. Recording it against the booking is a reasonable next
      // step once Zebra confirms what staff actually want to see there.
    });
    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Could not submit your booking request." }, { status: 400 });
  }
}
