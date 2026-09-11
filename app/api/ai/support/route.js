// ---------------------------------------------------------------------------
// ZEBRA AI SUPPORT: customer-facing chat endpoint.
// ---------------------------------------------------------------------------
// Anonymous visitors can use this (a customer should not have to sign in
// just to ask "what documents do I need"), signed-in customers get a
// conversation linked to their real account so their booking can be looked
// up (see lib/ai/tools.js getBooking). Never trusts a customerId from the
// request body, only from the verified session cookie.
// ---------------------------------------------------------------------------
import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/auth/requireCustomer";
import { canAccessAnonymousConversation, createConversation, getConversationById, getMessagesForConversation } from "@/lib/db/support";
import { handleSupportMessage } from "@/lib/ai/support";
import { isConfigured, getProviderName } from "@/lib/ai/provider";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "A message is required." }, { status: 400 });
  }

  const session = await getCustomerSession();
  let conversationId = typeof body?.conversationId === "string" ? body.conversationId : null;
  let accessToken;

  if (conversationId) {
    const existing = await getConversationById(conversationId);
    if (!existing) conversationId = null;
    // A conversation started while signed out cannot silently become
    // another customer's conversation just because a customerId was later
    // supplied, only ever trust the session, never the request body.
    else if (existing.customerId && existing.customerId !== session?.customerId) {
      return NextResponse.json({ error: "This conversation does not belong to your account." }, { status: 403 });
    } else if (!existing.customerId && !(await canAccessAnonymousConversation(conversationId, body?.accessToken))) {
      return NextResponse.json({ error: "A valid conversation access token is required." }, { status: 403 });
    }
  }
  if (!conversationId) {
    const conversation = await createConversation({ customerId: session?.customerId || null });
    conversationId = conversation.id;
    accessToken = conversation.accessToken;
  }

  const result = await handleSupportMessage({
    conversationId,
    customerId: session?.customerId || null,
    text,
  });

  return NextResponse.json({
    conversationId,
    ...(accessToken ? { accessToken } : {}),
    ...result,
    aiConnected: isConfigured(),
    provider: getProviderName(),
  });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversationId");
  if (!conversationId) return NextResponse.json({ error: "conversationId is required." }, { status: 400 });

  const session = await getCustomerSession();
  const conversation = await getConversationById(conversationId);
  if (!conversation) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (conversation.customerId && conversation.customerId !== session?.customerId) {
    return NextResponse.json({ error: "This conversation does not belong to your account." }, { status: 403 });
  }
  if (!conversation.customerId && !(await canAccessAnonymousConversation(conversationId, searchParams.get("accessToken")))) {
    return NextResponse.json({ error: "A valid conversation access token is required." }, { status: 403 });
  }

  const messages = await getMessagesForConversation(conversationId);
  return NextResponse.json({ conversation, messages });
}
