import { NextResponse } from "next/server";
import { getBookings } from "@/lib/db/bookings";
import { getSession } from "@/lib/auth/requireAdmin";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  return NextResponse.json({ bookings: getBookings() });
}
