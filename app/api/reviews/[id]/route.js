import { NextResponse } from "next/server";
import { setReviewPublished } from "@/lib/db/reviews";
import { getSession } from "@/lib/auth/requireAdmin";
import { logAction } from "@/lib/db/auditLog";

export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const patch = await request.json().catch(() => null);
  if (typeof patch?.published !== "boolean") {
    return NextResponse.json({ error: "published (boolean) is required." }, { status: 400 });
  }
  const review = await setReviewPublished(params.id, patch.published);
  if (!review) return NextResponse.json({ error: "Not found." }, { status: 404 });
  await logAction({
    userId: session.userId,
    action: patch.published ? "PUBLISH" : "UNPUBLISH",
    entityType: "Review",
    entityId: params.id,
  });
  return NextResponse.json({ review });
}
