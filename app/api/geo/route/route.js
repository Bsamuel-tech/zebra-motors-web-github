import { NextResponse } from "next/server";
import { getRoute } from "@/lib/geo/provider";

// Public endpoint, used by the trip planner to compute real segment and
// total distance/drive time between stops that have known coordinates.
// Returns { result: null } when the route could not be computed (fewer
// than 2 usable points, or the routing service failed), which the trip
// planner shows as an honest "not available" rather than a guess.
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const points = Array.isArray(body?.points) ? body.points : null;
  if (!points || points.length < 2) {
    return NextResponse.json({ error: "At least 2 points are required." }, { status: 400 });
  }
  const valid = points.every((p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lng));
  if (!valid) {
    return NextResponse.json({ error: "Each point needs numeric lat and lng." }, { status: 400 });
  }
  const result = await getRoute(points);
  return NextResponse.json({ result });
}
