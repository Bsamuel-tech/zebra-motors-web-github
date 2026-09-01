import { NextResponse } from "next/server";
import { getBookingById, setBookingStatus } from "@/lib/db/bookings";
import { getSession } from "@/lib/auth/requireAdmin";
import { logAction } from "@/lib/db/auditLog";

const VALID_STATUSES = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"];

export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const patch = await request.json().catch(() => null);
  if (!VALID_STATUSES.includes(patch?.status)) {
    return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` }, { status: 400 });
  }
  const existing = await getBookingById(params.id);
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const booking = await setBookingStatus(params.id, patch.status);
  await logAction({
    userId: session.userId,
    action: "UPDATE",
    entityType: "Booking",
    entityId: params.id,
    detail: `status -> ${patch.status}`,
  });
  return NextResponse.json({ booking });
}
