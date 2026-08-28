import { NextResponse } from "next/server";
import { getArticleById, updateArticle } from "@/lib/db/guideArticles";
import { getSession } from "@/lib/auth/requireAdmin";
import { logAction } from "@/lib/db/auditLog";

export async function GET(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const article = getArticleById(params.id);
  if (!article) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ article });
}

export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const patch = await request.json().catch(() => null);
  if (!patch) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  const article = updateArticle(params.id, patch);
  if (!article) return NextResponse.json({ error: "Not found." }, { status: 404 });
  logAction({
    userId: session.userId,
    action: "UPDATE",
    entityType: "GuideArticle",
    entityId: params.id,
    detail: Object.keys(patch).join(", "),
  });
  return NextResponse.json({ article });
}
