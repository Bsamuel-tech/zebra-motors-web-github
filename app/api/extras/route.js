import { NextResponse } from "next/server";
import { getExtras } from "@/lib/db/extras";

// Without this, Next.js statically prerenders this route at build time
// (it has no per-request input to force dynamic rendering) and every
// deploy would keep serving that frozen build-time snapshot forever, so an
// admin activating or pricing an extra later would never actually reach
// customers until the next full rebuild. Found live during the feature
// audit: this was the one API route in the app marked static instead of
// dynamic in the build output.
export const dynamic = "force-dynamic";

// Public endpoint used by the booking flow. Only ever returns extras that
// are active and either have a real confirmed price or are deliberately
// priced on request (CUSTOM_QUOTE), see lib/db/extras.js isPubliclyVisible.
export async function GET() {
  const extras = await getExtras({ activeOnly: true });
  return NextResponse.json({ extras });
}
