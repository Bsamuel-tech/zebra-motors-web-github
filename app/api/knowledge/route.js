import { NextResponse } from "next/server";
import { getKnowledgeArticles, createKnowledgeArticle, KNOWLEDGE_CATEGORIES } from "@/lib/db/knowledge";
import { getSession } from "@/lib/auth/requireAdmin";
import { logAction } from "@/lib/db/auditLog";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  // Same pattern as /api/faq: an admin sees drafts too, anyone else (the
  // AI Support retrieval layer, or a direct public request) only ever sees
  // published articles.
  const articles = await getKnowledgeArticles({ publishedOnly: !session });
  return NextResponse.json({ articles, categories: KNOWLEDGE_CATEGORIES });
}

export async function POST(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const input = await request.json().catch(() => null);
  if (!input?.title) {
    return NextResponse.json({ error: "title is required." }, { status: 400 });
  }
  const article = await createKnowledgeArticle(input);
  await logAction({ userId: session.userId, action: "CREATE", entityType: "KnowledgeArticle", entityId: article.id, detail: article.title });
  return NextResponse.json({ article }, { status: 201 });
}
