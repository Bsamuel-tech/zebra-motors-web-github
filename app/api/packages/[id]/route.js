import { NextResponse } from "next/server";
import { getPackageById, updatePackage } from "@/lib/db/packages";
import { getSession } from "@/lib/auth/requireAdmin";
import { logAction } from "@/lib/db/auditLog";

export async function GET(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const pkg = await getPackageById(params.id);
  if (!pkg) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ package: pkg });
}

export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const patch = await request.json().catch(() => null);
  if (!patch) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  const pkg = await updatePackage(params.id, patch);
  if (!pkg) return NextResponse.json({ error: "Not found." }, { status: 404 });
  await logAction({
    userId: session.userId,
    action: "UPDATE",
    entityType: "Package",
    entityId: params.id,
    detail: Object.keys(patch).join(", "),
  });
  return NextResponse.json({ package: pkg });
}
