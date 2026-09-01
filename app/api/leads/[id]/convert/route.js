import { NextResponse } from "next/server";
import { convertLeadToCustomer, getLeadById } from "@/lib/db/leads";
import { getSession } from "@/lib/auth/requireAdmin";
import { logAction } from "@/lib/db/auditLog";

// Admin action: turns a real lead into a real customer record. This does
// not create a booking, a customer can exist here before any booking does,
// see lib/db/leads.js for why that is the honest shape of the pipeline.
export async function POST(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const existing = await getLeadById(params.id);
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (existing.status === "CONVERTED") {
    return NextResponse.json({ error: "This lead is already converted." }, { status: 400 });
  }

  const result = await convertLeadToCustomer(params.id);
  await logAction({
    userId: session.userId,
    action: "CONVERT",
    entityType: "Lead",
    entityId: params.id,
    detail: `Converted to customer ${result.customerId}`,
  });
  return NextResponse.json(result);
}
