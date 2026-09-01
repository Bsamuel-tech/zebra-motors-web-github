import { NextResponse } from "next/server";
import { getBookings, createBooking } from "@/lib/db/bookings";
import { getSession } from "@/lib/auth/requireAdmin";
import { logAction } from "@/lib/db/auditLog";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  return NextResponse.json({ bookings: getBookings() });
}

// Admin-entered real booking (e.g. taken by phone or in person). The
// public site still only submits a lead (see /api/leads), this is Zebra
// staff recording an actual booking, not the customer self-checkout flow.
export async function POST(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const input = await request.json().catch(() => null);
  if (!input?.vehicleDbId || !input?.pickupDate || !input?.returnDate || !input?.customerName || !input?.customerEmail || !input?.totalRWF) {
    return NextResponse.json(
      { error: "vehicleDbId, pickupDate, returnDate, customerName, customerEmail, and totalRWF are required." },
      { status: 400 }
    );
  }
  let booking;
  try {
    booking = createBooking(input);
  } catch (err) {
    return NextResponse.json({ error: err.message || "Could not create booking." }, { status: 400 });
  }
  logAction({
    userId: session.userId,
    action: "CREATE",
    entityType: "Booking",
    entityId: booking.id,
    detail: booking.bookingNumber,
  });
  return NextResponse.json({ booking }, { status: 201 });
}
