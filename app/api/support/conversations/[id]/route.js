import { NextResponse } from "next/server";
import {
  getConversationById,
  getMessagesForConversation,
  updateConversation,
  addMessage,
} from "@/lib/db/support";
import { getCustomerById } from "@/lib/db/customers";
import { getBookingById } from "@/lib/db/bookings";
import { getSession } from "@/lib/auth/requireAdmin";
import { logAction } from "@/lib/db/auditLog";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });

  const conversation = await getConversationById(params.id);
  if (!conversation) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const [messages, customer, booking] = await Promise.all([
    getMessagesForConversation(params.id),
    conversation.customerId ? getCustomerById(conversation.customerId) : null,
    conversation.bookingId ? getBookingById(conversation.bookingId) : null,
  ]);

  return NextResponse.json({ conversation, messages, customer, booking });
}

// Admin actions on one conversation: take over, reply, resolve, reassign,
// close. Once assigned_agent_id is set here, lib/ai/support.js's
// isHumanAssigned() check makes the AI stop auto-responding in this
// conversation, enforced server-side, not just in the UI (spec item 9).
export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const conversation = await getConversationById(params.id);
  if (!conversation) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (body.action === "take_over") {
    await updateConversation(params.id, { assignedAgentId: session.userId, status: "WAITING_FOR_CUSTOMER" });
    await addMessage({ conversationId: params.id, senderType: "SYSTEM", content: `${session.name} joined the conversation.` });
  } else if (body.action === "reply") {
    if (!body.content?.trim()) return NextResponse.json({ error: "content is required." }, { status: 400 });
    await addMessage({ conversationId: params.id, senderType: "AGENT", content: body.content.trim() });
    await updateConversation(params.id, { status: "WAITING_FOR_CUSTOMER", assignedAgentId: conversation.assignedAgentId || session.userId });
  } else if (body.action === "resolve") {
    await updateConversation(params.id, { status: "RESOLVED" });
  } else if (body.action === "close") {
    await updateConversation(params.id, { status: "CLOSED" });
  } else if (body.action === "reassign") {
    await updateConversation(params.id, { assignedAgentId: body.agentId || null });
  } else {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  await logAction({ userId: session.userId, action: "UPDATE", entityType: "SupportConversation", entityId: params.id, detail: body.action });
  const updated = await getConversationById(params.id);
  return NextResponse.json({ conversation: updated });
}
