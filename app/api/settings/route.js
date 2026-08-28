import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/db/settings";
import { getSession } from "@/lib/auth/requireAdmin";
import { logAction } from "@/lib/db/auditLog";

export async function GET() {
  return NextResponse.json({ settings: getSettings() });
}

export async function PATCH(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const patch = await request.json().catch(() => null);
  if (!patch) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  const settings = updateSettings(patch);
  logAction({
    userId: session.userId,
    action: "UPDATE",
    entityType: "BusinessSettings",
    entityId: "singleton",
    detail: Object.keys(patch).join(", "),
  });
  return NextResponse.json({ settings });
}
