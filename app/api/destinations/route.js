import { NextResponse } from "next/server";
import { getDestinations, createDestination } from "@/lib/db/destinations";
import { getSession } from "@/lib/auth/requireAdmin";
import { logAction } from "@/lib/db/auditLog";

// Public GET: published only, supports ?q= for the unrestricted trip
// planner search (not limited to a fixed short list of buttons). An admin
// session (checked via ?all=1) can see unpublished rows too, the same
// pattern as /api/vehicles.
export async function GET(request) {
  const session = await getSession();
  const { searchParams } = new URL(request.url);
  const all = session && searchParams.get("all") === "1";
  const q = searchParams.get("q") || "";
  return NextResponse.json({ destinations: await getDestinations({ publishedOnly: !all, query: q }) });
}

export async function POST(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const input = await request.json().catch(() => null);
  if (!input?.name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }
  const destination = await createDestination(input);
  await logAction({
    userId: session.userId,
    action: "CREATE",
    entityType: "Destination",
    entityId: destination.dbId,
    detail: destination.name,
  });
  return NextResponse.json({ destination }, { status: 201 });
}
