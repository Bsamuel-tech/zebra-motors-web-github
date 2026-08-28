import { NextResponse } from "next/server";
import { getFaqs, createFaq } from "@/lib/db/faq";
import { getSession } from "@/lib/auth/requireAdmin";
import { logAction } from "@/lib/db/auditLog";

export async function GET() {
  const session = await getSession();
  return NextResponse.json({ faqs: getFaqs({ publishedOnly: !session }) });
}

export async function POST(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const input = await request.json().catch(() => null);
  if (!input?.question || !input?.answer) {
    return NextResponse.json({ error: "question and answer are required." }, { status: 400 });
  }
  const faq = createFaq(input);
  logAction({ userId: session.userId, action: "CREATE", entityType: "Faq", entityId: faq.id, detail: faq.q });
  return NextResponse.json({ faq }, { status: 201 });
}
