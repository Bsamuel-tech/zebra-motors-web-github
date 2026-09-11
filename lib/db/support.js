// ---------------------------------------------------------------------------
// ZEBRA AI: SUPPORT CONVERSATIONS
// ---------------------------------------------------------------------------
// One conversation per customer support issue, whether it stays fully
// AI-handled or is escalated to a real Zebra staff member. This is deliberate
// infrastructure the AI layer and the admin console (/admin/support) both
// read and write, real database rows, no mock conversation state kept only
// in the browser.
// ---------------------------------------------------------------------------
import { createHash, randomBytes } from "node:crypto";
import { getDb, newId, nowIso } from "./client";

export const CONVERSATION_STATUSES = [
  "OPEN",
  "AI_HANDLING",
  "WAITING_FOR_CUSTOMER",
  "WAITING_FOR_ZEBRA",
  "ESCALATED",
  "RESOLVED",
  "CLOSED",
];

export const SENDER_TYPES = ["CUSTOMER", "AI", "AGENT", "SYSTEM"];

function rowToConversation(row) {
  return {
    id: row.id,
    customerId: row.customer_id,
    bookingId: row.booking_id,
    status: row.status,
    priority: row.priority,
    assignedAgentId: row.assigned_agent_id,
    aiSummary: row.ai_summary,
    escalationReason: row.escalation_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToMessage(row) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderType: row.sender_type,
    content: row.content,
    metadata: JSON.parse(row.metadata_json || "{}"),
    createdAt: row.created_at,
  };
}

export async function createConversation({ customerId = null, bookingId = null } = {}) {
  const db = await getDb();
  const id = newId();
  const accessToken = customerId ? null : randomBytes(32).toString("hex");
  const accessTokenHash = accessToken ? hashAccessToken(accessToken) : null;
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO support_conversations (id, customer_id, booking_id, status, priority, ai_summary, access_token_hash, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?)`
    )
    .run(id, customerId, bookingId, "AI_HANDLING", "NORMAL", "", accessTokenHash, now, now);
  const conversation = await getConversationById(id);
  return accessToken ? { ...conversation, accessToken } : conversation;
}

function hashAccessToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export async function canAccessAnonymousConversation(id, accessToken) {
  if (!accessToken || typeof accessToken !== "string") return false;
  const db = await getDb();
  const row = await db.prepare("SELECT access_token_hash FROM support_conversations WHERE id = ? AND customer_id IS NULL").get(id);
  return Boolean(row?.access_token_hash && row.access_token_hash === hashAccessToken(accessToken));
}

export async function getConversationById(id) {
  const db = await getDb();
  const row = await db.prepare("SELECT * FROM support_conversations WHERE id = ?").get(id);
  return row ? rowToConversation(row) : null;
}

export async function getConversations({ status = null } = {}) {
  const db = await getDb();
  let sql = "SELECT * FROM support_conversations";
  const params = [];
  if (status) {
    sql += " WHERE status = ?";
    params.push(status);
  }
  sql += " ORDER BY updated_at DESC";
  const rows = await db.prepare(sql).all(...params);
  return rows.map(rowToConversation);
}

export async function updateConversation(id, patch) {
  const existing = await getConversationById(id);
  if (!existing) return null;
  const db = await getDb();
  const sets = [];
  const values = [];
  const fieldMap = {
    status: "status",
    priority: "priority",
    assignedAgentId: "assigned_agent_id",
    aiSummary: "ai_summary",
    escalationReason: "escalation_reason",
  };
  for (const [key, column] of Object.entries(fieldMap)) {
    if (patch[key] !== undefined) {
      sets.push(`${column} = ?`);
      values.push(patch[key]);
    }
  }
  if (sets.length) {
    sets.push("updated_at = ?");
    values.push(nowIso());
    values.push(id);
    await db.prepare(`UPDATE support_conversations SET ${sets.join(", ")} WHERE id = ?`).run(...values);
  }
  return getConversationById(id);
}

// A human has taken this conversation over. From this point the AI must not
// auto-reply in it, callers check this before generating any AI response
// (see lib/ai/support.js), this is enforced server-side, not just hidden in
// the UI.
export async function isHumanAssigned(conversationId) {
  const conversation = await getConversationById(conversationId);
  return Boolean(conversation?.assignedAgentId);
}

export async function addMessage({ conversationId, senderType, content, metadata = {} }) {
  if (!SENDER_TYPES.includes(senderType)) {
    throw new Error(`senderType must be one of ${SENDER_TYPES.join(", ")}`);
  }
  const db = await getDb();
  const id = newId();
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO support_messages (id, conversation_id, sender_type, content, metadata_json, created_at)
       VALUES (?,?,?,?,?,?)`
    )
    .run(id, conversationId, senderType, content || "", JSON.stringify(metadata || {}), now);
  await db
    .prepare("UPDATE support_conversations SET updated_at = ? WHERE id = ?")
    .run(now, conversationId);
  return getMessageById(id);
}

export async function getMessageById(id) {
  const db = await getDb();
  const row = await db.prepare("SELECT * FROM support_messages WHERE id = ?").get(id);
  return row ? rowToMessage(row) : null;
}

export async function getMessagesForConversation(conversationId) {
  const db = await getDb();
  const rows = await db
    .prepare("SELECT * FROM support_messages WHERE conversation_id = ? ORDER BY created_at ASC")
    .all(conversationId);
  return rows.map(rowToMessage);
}

// Auditability (AI architecture spec, item 22). One row per AI turn: what
// model answered, which tools it called, which knowledge articles it
// quoted, and whether it escalated. Deliberately does not duplicate raw
// message text, that already lives in support_messages.
export async function logAiInteraction({
  conversationId = null,
  provider = "none",
  model = "",
  toolsCalled = [],
  knowledgeSources = [],
  escalated = false,
  escalationReason = null,
}) {
  const db = await getDb();
  const id = newId();
  await db
    .prepare(
      `INSERT INTO ai_interaction_log
       (id, conversation_id, provider, model, tools_called_json, knowledge_sources_json, escalated, escalation_reason, created_at)
       VALUES (?,?,?,?,?,?,?,?,?)`
    )
    .run(
      id,
      conversationId,
      provider,
      model,
      JSON.stringify(toolsCalled),
      JSON.stringify(knowledgeSources),
      escalated ? 1 : 0,
      escalationReason,
      nowIso()
    );
  return id;
}
