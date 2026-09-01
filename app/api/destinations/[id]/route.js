import { NextResponse } from "next/server";
import { getDestinationByDbId, updateDestination, unpublishDestination } from "@/lib/db/destinations";
import { getSession } from "@/lib/auth/requireAdmin";
import { logAction } from "@/lib/db/auditLog";

export async function GET(request, { params }) {
  const destination = getDestinationByDbId(params.id);
  if (!destination) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ destination });
}

export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const patch = await request.json().catch(() => null);
  if (!patch) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  const destination = updateDestination(params.id, patch);
  if (!destination) return NextResponse.json({ error: "Not found." }, { status: 404 });
  logAction({
    userId: session.userId,
    action: "UPDATE",
    entityType: "Destination",
    entityId: params.id,
    detail: Object.keys(patch).join(", "),
  });
  return NextResponse.json({ destination });
}

// Unpublish, not a hard delete, same choice made for vehicles, so a
// mistaken removal never loses real admin-entered content.
export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const destination = unpublishDestination(params.id);
  if (!destination) return NextResponse.json({ error: "Not found." }, { status: 404 });
  logAction({ userId: session.userId, action: "UNPUBLISH", entityType: "Destination", entityId: params.id });
  return NextResponse.json({ destination });
}
