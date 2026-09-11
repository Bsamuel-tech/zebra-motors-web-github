"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const TABS = [
  { key: "ALL", label: "All" },
  { key: "OPEN", label: "New" },
  { key: "AI_HANDLING", label: "AI handled" },
  { key: "WAITING_FOR_CUSTOMER", label: "Waiting for customer" },
  { key: "WAITING_FOR_ZEBRA", label: "Waiting for Zebra" },
  { key: "ESCALATED", label: "Escalated" },
  { key: "RESOLVED", label: "Resolved" },
];

const STATUS_BADGE = {
  OPEN: "badge-muted",
  AI_HANDLING: "badge-sand",
  WAITING_FOR_CUSTOMER: "badge-sand",
  WAITING_FOR_ZEBRA: "badge-danger",
  ESCALATED: "badge-danger",
  RESOLVED: "badge-forest",
  CLOSED: "badge-muted",
};

export default function SupportInbox({ conversations }) {
  const [tab, setTab] = useState("ALL");

  const filtered = useMemo(
    () => (tab === "ALL" ? conversations : conversations.filter((c) => c.status === tab)),
    [conversations, tab]
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              fontSize: 12.5,
              padding: "6px 12px",
              border: "1px solid var(--line)",
              background: tab === t.key ? "var(--ink)" : "none",
              color: tab === t.key ? "#fff" : "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            {t.label} ({t.key === "ALL" ? conversations.length : conversations.filter((c) => c.status === t.key).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ padding: 24 }}>
          <p className="muted" style={{ fontSize: 13.5 }}>No conversations in this view.</p>
        </div>
      ) : (
        <div className="card">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
                <th style={{ padding: "12px 16px" }}>Started</th>
                <th style={{ padding: "12px 16px" }}>Summary</th>
                <th style={{ padding: "12px 16px" }}>Status</th>
                <th style={{ padding: "12px 16px" }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "12px 16px", color: "var(--muted)", whiteSpace: "nowrap" }}>
                    {new Date(c.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: "12px 16px", maxWidth: 420 }}>
                    {c.aiSummary || c.escalationReason || "No summary yet."}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span className={`badge ${STATUS_BADGE[c.status] || "badge-muted"}`}>{c.status.replaceAll("_", " ")}</span>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <Link href={`/admin/support/${c.id}`} style={{ fontSize: 13, fontWeight: 600 }}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
