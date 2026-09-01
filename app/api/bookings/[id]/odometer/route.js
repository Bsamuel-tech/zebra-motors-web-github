import { NextResponse } from "next/server";
import { getBookingById, recordOdometer } from "@/lib/db/bookings";
import { getSession } from "@/lib/auth/requireAdmin";
import { logAction } from "@/lib/db/auditLog";

// Admin-only. Records a real odometer reading at vehicle pickup and/or
// return, never an estimate, this is what /admin/trips compares against
// the vehicle's real mileage policy (lib/db/bookings.js getMileageUsage()).
export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const patch = await request.json().catch(() => null);
  if (!patch || (patch.pickupOdometerKm === undefined && patch.returnOdometerKm === undefined)) {
    return NextResponse.json({ error: "pickupOdometerKm and/or returnOdometerKm are required." }, { status: 400 });
  }
  const existing = await getBookingById(params.id);
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const booking = await recordOdometer(params.id, patch);
  await logAction({
    userId: session.userId,
    action: "UPDATE",
    entityType: "Booking",
    entityId: params.id,
    detail: `odometer: ${Object.keys(patch).join(", ")}`,
  });
  return NextResponse.json({ booking });
}
