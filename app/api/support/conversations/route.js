import { NextResponse } from "next/server";
import { getConversations } from "@/lib/db/support";
import { getSession } from "@/lib/auth/requireAdmin";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const conversations = await getConversations({ status: status || null });
  return NextResponse.json({ conversations });
}
