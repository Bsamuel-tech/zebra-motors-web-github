import { NextResponse } from "next/server";
import { markWhatIfContinued } from "@/lib/db/whatIfSessions";

// Fired when a customer clicks "Continue with this option", so the admin
// What If analytics view can show a real conversion count, not an invented
// one. Fire-and-forget from the client, never blocks the actual navigation.
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  if (body.sessionId) await markWhatIfContinued(body.sessionId);
  return NextResponse.json({ ok: true });
}
