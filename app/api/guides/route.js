import { NextResponse } from "next/server";
import { getArticles, createArticle } from "@/lib/db/guideArticles";
import { getSession } from "@/lib/auth/requireAdmin";
import { logAction } from "@/lib/db/auditLog";

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET() {
  const session = await getSession();
  return NextResponse.json({ articles: getArticles({ publishedOnly: !session }) });
}

export async function POST(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const input = await request.json().catch(() => null);
  if (!input?.title || !input?.excerpt) {
    return NextResponse.json({ error: "title and excerpt are required." }, { status: 400 });
  }
  const slug = input.slug || slugify(input.title);
  const article = createArticle({ ...input, slug });
  logAction({ userId: session.userId, action: "CREATE", entityType: "GuideArticle", entityId: article.id, detail: article.title });
  return NextResponse.json({ article }, { status: 201 });
}
