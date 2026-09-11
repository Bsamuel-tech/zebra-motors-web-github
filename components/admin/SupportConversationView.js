"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SENDER_LABEL = { CUSTOMER: "Customer", AI: "Zebra AI", AGENT: "You", SYSTEM: "System" };

// The human agent's view, item 25 of the AI architecture spec: AI summary,
// customer, booking, and the real conversation, with take-over/reply/
// resolve actions. Once you take over, the AI stops answering here (see
// lib/ai/support.js isHumanAssigned()), so replying below is real, direct
// support, not a suggestion the AI might override.
export default function SupportConversationView({ conversation, messages, customer, booking }) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [pending, setPending] = useState(false);

  async function act(action, extra = {}) {
    setPending(true);
    await fetch(`/api/support/conversations/${conversation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    setPending(false);
    setReply("");
    router.refresh();
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24, alignItems: "start" }}>
      <div>
        <h1 style={{ fontSize: 20, marginBottom: 4 }}>Conversation</h1>
        <p className="muted" style={{ fontSize: 12.5, marginBottom: 16 }}>
          Started {new Date(conversation.createdAt).toLocaleString()}, status {conversation.status.replaceAll("_", " ")}
          {conversation.assignedAgentId ? ", AI is not replying in this conversation" : ""}.
        </p>

        <div className="card" style={{ padding: 16, marginBottom: 16, maxHeight: 480, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {messages.map((m) => (
            <div key={m.id} style={{ fontSize: 13.5 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>
                {SENDER_LABEL[m.senderType] || m.senderType} · {new Date(m.createdAt).toLocaleTimeString()}
              </div>
              <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          {!conversation.assignedAgentId && (
            <button className="btn-primary" disabled={pending} onClick={() => act("take_over")}>
              Take over
            </button>
          )}
          <button disabled={pending} onClick={() => act("resolve")} style={{ border: "1px solid var(--line)", background: "none", padding: "8px 14px", cursor: "pointer" }}>
            Mark resolved
          </button>
          <button disabled={pending} onClick={() => act("close")} style={{ border: "1px solid var(--line)", background: "none", padding: "8px 14px", cursor: "pointer" }}>
            Close
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (reply.trim()) act("reply", { content: reply.trim() });
          }}
          style={{ display: "flex", gap: 8 }}
        >
          <input type="text" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply to the customer..." style={{ flex: 1 }} />
          <button type="submit" className="btn-primary" disabled={pending || !reply.trim()}>
            Reply
          </button>
        </form>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--muted)", marginBottom: 8 }}>
            AI summary
          </div>
          <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{conversation.aiSummary || "No summary yet."}</div>
        </div>
        {customer && (
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--muted)", marginBottom: 8 }}>
              Customer
            </div>
            <div style={{ fontSize: 13 }}>{customer.name}</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{customer.email}</div>
          </div>
        )}
        {booking && (
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--muted)", marginBottom: 8 }}>
              Booking
            </div>
            <div style={{ fontSize: 13 }}>{booking.bookingNumber}</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
              {booking.vehicleName}, {booking.pickupDate} to {booking.returnDate}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
