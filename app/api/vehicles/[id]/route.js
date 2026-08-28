import { NextResponse } from "next/server";
import { getVehicleByDbId, updateVehicle, archiveVehicle } from "@/lib/db/vehicles";
import { getSession } from "@/lib/auth/requireAdmin";
import { logAction } from "@/lib/db/auditLog";

export async function GET(request, { params }) {
  const vehicle = getVehicleByDbId(params.id);
  if (!vehicle) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ vehicle });
}

export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const patch = await request.json().catch(() => null);
  if (!patch) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  const vehicle = updateVehicle(params.id, patch);
  if (!vehicle) return NextResponse.json({ error: "Not found." }, { status: 404 });
  logAction({
    userId: session.userId,
    action: "UPDATE",
    entityType: "Vehicle",
    entityId: params.id,
    detail: Object.keys(patch).join(", "),
  });
  return NextResponse.json({ vehicle });
}

export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const vehicle = archiveVehicle(params.id);
  if (!vehicle) return NextResponse.json({ error: "Not found." }, { status: 404 });
  logAction({ userId: session.userId, action: "ARCHIVE", entityType: "Vehicle", entityId: params.id });
  return NextResponse.json({ vehicle });
}
