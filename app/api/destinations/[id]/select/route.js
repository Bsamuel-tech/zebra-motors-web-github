import { NextResponse } from "next/server";
import { recordDestinationSelection } from "@/lib/db/destinations";

// Public, fire-and-forget. Called once when a customer adds a real
// published destination to their trip planner route, a genuine popularity
// signal (Rule 2: only ever counts a real event, never estimated).
export async function POST(request, { params }) {
  await recordDestinationSelection(params.id);
  return NextResponse.json({ ok: true });
}
