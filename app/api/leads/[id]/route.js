import { NextResponse } from "next/server";
import { updateLeadStatus, getLeadById } from "@/lib/db/leads";
import { getSession } from "@/lib/auth/requireAdmin";
import { logAction } from "@/lib/db/auditLog";

const VALID_STATUSES = ["NEW", "CONTACTED", "CONVERTED", "LOST"];

export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const patch = await request.json().catch(() => ({}));
  if (patch.status && !VALID_STATUSES.includes(patch.status)) {
    return NextResponse.json({ error: `status must be one of ${VALID_STATUSES.join(", ")}.` }, { status: 400 });
  }
  const existing = getLeadById(params.id);
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const lead = updateLeadStatus(params.id, {
    status: patch.status,
    adminNotes: typeof patch.adminNotes === "string" ? patch.adminNotes : undefined,
  });
  logAction({
    userId: session.userId,
    action: "UPDATE",
    entityType: "Lead",
    entityId: params.id,
    detail: patch.status ? `Status set to ${patch.status}` : "Notes updated",
  });
  return NextResponse.json({ lead });
}
