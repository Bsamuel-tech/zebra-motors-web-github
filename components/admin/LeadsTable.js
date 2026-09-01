"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_OPTIONS = ["NEW", "CONTACTED", "CONVERTED", "LOST"];
const STATUS_BADGE = {
  NEW: "badge-forest",
  CONTACTED: "badge-sand",
  CONVERTED: "badge-forest",
  LOST: "badge-muted",
};

export default function LeadsTable({ leads }) {
  const router = useRouter();
  const [pending, setPending] = useState(null);
  const [notesDraft, setNotesDraft] = useState({});

  async function setStatus(lead, status) {
    setPending(lead.id);
    await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setPending(null);
    router.refresh();
  }

  async function saveNotes(lead) {
    const adminNotes = notesDraft[lead.id] ?? lead.adminNotes;
    setPending(lead.id);
    await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminNotes }),
    });
    setPending(null);
    router.refresh();
  }

  async function convert(lead) {
    setPending(lead.id);
    const res = await fetch(`/api/leads/${lead.id}/convert`, { method: "POST" });
    setPending(null);
    if (res.ok) router.refresh();
  }

  if (leads.length === 0) {
    return (
      <p className="muted" style={{ fontSize: 13.5 }}>
        No leads yet, this fills in as soon as a real visitor submits the contact form.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {leads.map((lead) => (
        <div key={lead.id} className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14.5 }}>{lead.name}</div>
              <div className="muted" style={{ fontSize: 12.5 }}>
                {lead.email}
                {lead.phone ? ` · ${lead.phone}` : ""} · {new Date(lead.createdAt).toLocaleString()} · {lead.source}
              </div>
            </div>
            <span className={`badge ${STATUS_BADGE[lead.status] || "badge-muted"}`}>{lead.status}</span>
          </div>

          <p style={{ fontSize: 13.5, lineHeight: 1.6, marginBottom: 12 }}>{lead.message}</p>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {STATUS_OPTIONS.filter((s) => s !== lead.status && s !== "CONVERTED").map((s) => (
              <button
                key={s}
                onClick={() => setStatus(lead, s)}
                disabled={pending === lead.id}
                style={{ background: "none", border: "1px solid var(--line)", padding: "6px 12px", fontSize: 12, cursor: "pointer" }}
              >
                Mark {s.toLowerCase()}
              </button>
            ))}
            {lead.status !== "CONVERTED" && (
              <button
                onClick={() => convert(lead)}
                disabled={pending === lead.id}
                className="btn-outline"
                style={{ padding: "6px 12px", fontSize: 12 }}
              >
                Convert to customer
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              placeholder="Admin notes"
              value={notesDraft[lead.id] ?? lead.adminNotes}
              onChange={(e) => setNotesDraft({ ...notesDraft, [lead.id]: e.target.value })}
              style={{ flex: 1, border: "1px solid var(--line)", padding: "8px 10px", fontSize: 12.5 }}
            />
            <button
              onClick={() => saveNotes(lead)}
              disabled={pending === lead.id}
              style={{ background: "none", border: "1px solid var(--line)", padding: "6px 12px", fontSize: 12, cursor: "pointer" }}
            >
              Save
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
