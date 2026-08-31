import { NextResponse } from "next/server";
import { getExtras } from "@/lib/db/extras";

// Public endpoint used by the booking flow. Only ever returns extras that
// are active and either have a real confirmed price or are deliberately
// priced on request (CUSTOM_QUOTE), see lib/db/extras.js isPubliclyVisible.
export async function GET() {
  const extras = getExtras({ activeOnly: true });
  return NextResponse.json({ extras });
}
