import { NextResponse } from "next/server";
import { updateMaintenanceRecord, getMaintenanceRecordById } from "@/lib/db/maintenance";
import { getSession } from "@/lib/auth/requireAdmin";
import { logAction } from "@/lib/db/auditLog";

const VALID_STATUSES = ["SCHEDULED", "IN_PROGRESS", "DONE", "CANCELLED"];

export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const existing = getMaintenanceRecordById(params.id);
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: `status must be one of ${VALID_STATUSES.join(", ")}.` }, { status: 400 });
  }

  const record = updateMaintenanceRecord(params.id, {
    status: body.status,
    completedDate: body.completedDate,
    costRWF: body.costRWF != null && body.costRWF !== "" ? Number(body.costRWF) : body.costRWF,
    odometerKm: body.odometerKm != null && body.odometerKm !== "" ? Number(body.odometerKm) : body.odometerKm,
    notes: body.notes,
  });

  logAction({
    userId: session.userId,
    action: "UPDATE",
    entityType: "MaintenanceRecord",
    entityId: params.id,
    detail: body.status ? `Status set to ${body.status}` : "Details updated",
  });

  return NextResponse.json({ record });
}
