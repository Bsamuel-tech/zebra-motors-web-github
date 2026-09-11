import { NextResponse } from "next/server";
import { getKnowledgeArticleById, updateKnowledgeArticle, unpublishKnowledgeArticle } from "@/lib/db/knowledge";
import { getSession } from "@/lib/auth/requireAdmin";
import { logAction } from "@/lib/db/auditLog";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const patch = await request.json().catch(() => null);
  if (!patch) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  const article = await updateKnowledgeArticle(params.id, patch);
  if (!article) return NextResponse.json({ error: "Not found." }, { status: 404 });
  await logAction({
    userId: session.userId,
    action: "UPDATE",
    entityType: "KnowledgeArticle",
    entityId: params.id,
    detail: Object.keys(patch).join(", "),
  });
  return NextResponse.json({ article });
}

// Soft delete, same convention as vehicles/destinations elsewhere: this
// unpublishes rather than destroys, so a retired policy article is never
// unrecoverable admin work.
export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const existing = await getKnowledgeArticleById(params.id);
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });
  await unpublishKnowledgeArticle(params.id);
  await logAction({ userId: session.userId, action: "UNPUBLISH", entityType: "KnowledgeArticle", entityId: params.id, detail: existing.title });
  return NextResponse.json({ ok: true });
}
