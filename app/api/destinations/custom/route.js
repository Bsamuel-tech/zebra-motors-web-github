import { NextResponse } from "next/server";
import { logCustomDestinationRequest } from "@/lib/db/destinations";

// Public endpoint, called when a customer types a destination into the trip
// planner that is not in the real published catalogue. This only ever logs
// a demand signal for Zebra to review, it never publishes anything to the
// public site on its own (see prisma/schema.sql's comment on
// custom_destination_requests).
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }
  const request_ = await logCustomDestinationRequest({
    name,
    notes: typeof body?.notes === "string" ? body.notes : "",
    source: typeof body?.source === "string" ? body.source : "trip_planner",
  });
  return NextResponse.json({ request: request_ });
}
