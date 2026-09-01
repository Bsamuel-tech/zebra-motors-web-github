import { NextResponse } from "next/server";
import { getFaqs, updateFaq, deleteFaq } from "@/lib/db/faq";
import { getSession } from "@/lib/auth/requireAdmin";
import { logAction } from "@/lib/db/auditLog";

export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const patch = await request.json().catch(() => null);
  if (!patch) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  const faq = await updateFaq(params.id, patch);
  if (!faq) return NextResponse.json({ error: "Not found." }, { status: 404 });
  await logAction({
    userId: session.userId,
    action: "UPDATE",
    entityType: "Faq",
    entityId: params.id,
    detail: Object.keys(patch).join(", "),
  });
  return NextResponse.json({ faq });
}

export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const existing = (await getFaqs()).find((f) => f.id === params.id);
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });
  await deleteFaq(params.id);
  await logAction({ userId: session.userId, action: "DELETE", entityType: "Faq", entityId: params.id, detail: existing.q });
  return NextResponse.json({ ok: true });
}
