import { NextResponse } from "next/server";
import { geocodePlace } from "@/lib/geo/provider";

// Public endpoint, used by the trip planner to place a customer's own typed
// destination on the route map, and by the admin destination form's
// "Geocode" convenience button. Returns { result: null } rather than an
// error when the place could not be found, that is an expected, honest
// outcome, not a failure.
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query : "";
  if (!query.trim()) {
    return NextResponse.json({ error: "query is required." }, { status: 400 });
  }
  const result = await geocodePlace(query);
  return NextResponse.json({ result });
}
