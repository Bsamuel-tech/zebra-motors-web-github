import { NextResponse } from "next/server";
import { createLead } from "@/lib/db/leads";

// Public endpoint, called from the contact form (and, in future, any other
// real point of interest capture). No admin session required to submit a
// lead, anyone contacting Zebra is allowed to.
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Name, email, and message are required." }, { status: 400 });
  }

  const lead = createLead({
    name,
    email,
    phone,
    message,
    source: typeof body?.source === "string" ? body.source : "contact_form",
    vehicleId: typeof body?.vehicleId === "string" ? body.vehicleId : null,
  });

  return NextResponse.json({ lead });
}
