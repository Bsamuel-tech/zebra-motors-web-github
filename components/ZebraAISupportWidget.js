"use client";

// ---------------------------------------------------------------------------
// ZEBRA AI SUPPORT: floating customer chat widget.
// ---------------------------------------------------------------------------
// Uses Zebra's existing brand tokens (--forest, --sand, --zebra-yellow),
// deliberately not a neon/purple "AI" aesthetic (spec item 26): a plain
// yellow launcher button, the same serif wordmark used across the site, no
// glow, no gradient, no robot icon.
// ---------------------------------------------------------------------------
import { useState, useRef, useEffect } from "react";

const QUICK_ACTIONS = [
  { label: "Check booking", text: "I want to check my booking." },
  { label: "Change pickup", text: "I want to change my pickup time." },
  { label: "Plan a trip", text: "Can you help me plan a trip to Rwanda?" },
  { label: "Talk to Zebra Motors", text: "I want to talk to a human." },
];

export default function ZebraAISupportWidget() {
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  async function send(text) {
    const trimmed = (text ?? input).trim();
    if (!trimmed || sending) return;
    setSending(true);
    setInput("");
    setMessages((m) => [...m, { senderType: "CUSTOMER", content: trimmed }]);

    const res = await fetch("/api/ai/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, accessToken, text: trimmed }),
    });
    const data = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) {
      setMessages((m) => [...m, { senderType: "SYSTEM", content: data.error || "Something went wrong, please try again." }]);
      return;
    }
    setConversationId(data.conversationId);
    if (data.accessToken) setAccessToken(data.accessToken);
    if (data.escalated) setEscalated(true);
    if (data.reply) {
      setMessages((m) => [...m, { senderType: "AI", content: data.reply, offerEscalation: data.offerEscalation }]);
    } else if (data.handledBy === "human") {
      setMessages((m) => [...m, { senderType: "SYSTEM", content: data.note }]);
    }
  }

  return (
    <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 200 }}>
      {open && (
        <div
          className="card"
          style={{
            width: 340,
            maxWidth: "calc(100vw - 40px)",
            height: 460,
            maxHeight: "calc(100vh - 120px)",
            display: "flex",
            flexDirection: "column",
            marginBottom: 12,
            boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid var(--line)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "var(--forest-dark)",
              color: "#fff",
            }}
          >
            <div>
              <div className="serif" style={{ fontSize: 15 }}>Zebra Assistant Support</div>
              <div style={{ fontSize: 11, color: "#c9c6b6" }}>
                {escalated ? "Connected with the Zebra Motors team" : "How can we help you today?"}
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              style={{ background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer" }}
            >
              ×
            </button>
          </div>

          <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.length === 0 && (
              <div style={{ fontSize: 13, color: "var(--muted)" }}>
                Ask about the fleet, pricing, your booking, or planning a trip.
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.senderType === "CUSTOMER" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  background: m.senderType === "CUSTOMER" ? "var(--zebra-yellow)" : m.senderType === "SYSTEM" ? "var(--paper-alt)" : "var(--paper-alt)",
                  color: "var(--ink)",
                  padding: "8px 12px",
                  fontSize: 13.5,
                  whiteSpace: "pre-wrap",
                  borderRadius: 4,
                }}
              >
                {m.content}
              </div>
            ))}
            {sending && <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Typing...</div>}
          </div>

          <div style={{ padding: "8px 14px", display: "flex", gap: 6, flexWrap: "wrap", borderTop: "1px solid var(--line)" }}>
            {QUICK_ACTIONS.map((qa) => (
              <button
                key={qa.label}
                onClick={() => send(qa.text)}
                disabled={sending}
                style={{
                  fontSize: 11.5,
                  padding: "5px 9px",
                  border: "1px solid var(--line)",
                  background: "none",
                  cursor: "pointer",
                  color: "var(--ink-soft)",
                }}
              >
                {qa.label}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid var(--line)" }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              style={{ flex: 1, fontSize: 13.5 }}
            />
            <button type="submit" className="btn-primary" disabled={sending || !input.trim()} style={{ padding: "8px 14px" }}>
              Send
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open Zebra Assistant Support"
        title="Zebra Assistant Support"
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "var(--zebra-yellow)",
          border: "none",
          boxShadow: "0 6px 18px rgba(0,0,0,0.22)",
          cursor: "pointer",
          fontSize: 22,
          color: "var(--on-yellow)",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {open ? (
          "×"
        ) : (
          // A plain speech-bubble icon rather than a bare "Z", which
          // customers reported as unclear on its own (a single letter reads
          // as a logo mark, not an invitation to chat). Still no robot or
          // neon "AI" aesthetic, per this widget's own design rule above.
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        )}
      </button>
    </div>
  );
}
