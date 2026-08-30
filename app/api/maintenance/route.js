import { NextResponse } from "next/server";
import { createMaintenanceRecord } from "@/lib/db/maintenance";
import { getSession } from "@/lib/auth/requireAdmin";
import { logAction } from "@/lib/db/auditLog";

const VALID_TYPES = ["service", "repair", "inspection", "other"];

// Admin only. A maintenance record is only ever created by staff for a
// real vehicle, there is no automatic scheduling.
export async function POST(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  if (!body.vehicleId) {
    return NextResponse.json({ error: "vehicleId is required." }, { status: 400 });
  }
  const type = VALID_TYPES.includes(body.type) ? body.type : "service";

  const record = createMaintenanceRecord({
    vehicleId: body.vehicleId,
    type,
    description: typeof body.description === "string" ? body.description : "",
    scheduledDate: body.scheduledDate || null,
    costRWF: body.costRWF != null && body.costRWF !== "" ? Number(body.costRWF) : null,
    odometerKm: body.odometerKm != null && body.odometerKm !== "" ? Number(body.odometerKm) : null,
    notes: typeof body.notes === "string" ? body.notes : "",
  });

  logAction({
    userId: session.userId,
    action: "CREATE",
    entityType: "MaintenanceRecord",
    entityId: record.id,
    detail: `${type} for vehicle ${body.vehicleId}`,
  });

  return NextResponse.json({ record });
}
