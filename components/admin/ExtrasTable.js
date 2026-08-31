"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PRICING_LABELS = {
  PER_DAY: "Per day",
  PER_BOOKING: "Per booking",
  PER_KM: "Per kilometre",
  CUSTOM_QUOTE: "Custom quote",
};

// Admin control for the real rental_extras table. This is what replaced
// the fabricated "Airport delivery, estimated RWF 15,000" and "GPS,
// estimated RWF 3,000/day" line items in the old booking flow: nothing here
// shows to a customer until an admin actively sets a real price and turns
// it on, or marks it CUSTOM_QUOTE so the price is worked out directly with
// Zebra instead of guessed.
export default function ExtrasTable({ extras }) {
  const router = useRouter();
  const [pending, setPending] = useState(null);
  const [drafts, setDrafts] = useState({});

  function draftFor(extra) {
    return (
      drafts[extra.id] || {
        pricingType: extra.pricingType,
        priceRWF: extra.priceRWF === null || extra.priceRWF === undefined ? "" : String(extra.priceRWF),
      }
    );
  }

  function setDraft(extra, patch) {
    setDrafts({ ...drafts, [extra.id]: { ...draftFor(extra), ...patch } });
  }

  async function save(extra) {
    const draft = draftFor(extra);
    setPending(extra.id);
    await fetch(`/api/extras/${extra.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pricingType: draft.pricingType,
        priceRWF: draft.priceRWF === "" ? null : Number(draft.priceRWF),
      }),
    });
    setPending(null);
    router.refresh();
  }

  async function toggleActive(extra) {
    setPending(extra.id);
    await fetch(`/api/extras/${extra.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !extra.active }),
    });
    setPending(null);
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {extras.map((extra) => {
        const draft = draftFor(extra);
        const canGoLive = draft.pricingType === "CUSTOM_QUOTE" || draft.priceRWF !== "";
        return (
          <div key={extra.id} className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14.5 }}>{extra.name}</div>
                <div className="muted" style={{ fontSize: 12.5 }}>{extra.description}</div>
              </div>
              <span className={`badge ${extra.active ? "badge-forest" : "badge-muted"}`}>
                {extra.active ? "Shown to customers" : "Hidden from customers"}
              </span>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
              <select
                value={draft.pricingType}
                onChange={(e) => setDraft(extra, { pricingType: e.target.value })}
                style={{ border: "1px solid var(--line)", padding: "8px 10px", fontSize: 12.5 }}
              >
                {Object.entries(PRICING_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              {draft.pricingType !== "CUSTOM_QUOTE" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="number"
                    min="0"
                    placeholder="Not yet confirmed"
                    value={draft.priceRWF}
                    onChange={(e) => setDraft(extra, { priceRWF: e.target.value })}
                    style={{ width: 160, border: "1px solid var(--line)", padding: "8px 10px", fontSize: 12.5 }}
                  />
                  <span className="muted" style={{ fontSize: 12 }}>RWF</span>
                </div>
              )}

              <button
                onClick={() => save(extra)}
                disabled={pending === extra.id}
                style={{ background: "none", border: "1px solid var(--line)", padding: "8px 14px", fontSize: 12, cursor: "pointer" }}
              >
                Save price
              </button>

              <button
                onClick={() => toggleActive(extra)}
                disabled={pending === extra.id || (!extra.active && !canGoLive)}
                className={extra.active ? "btn-outline" : "btn-primary"}
                style={{ padding: "8px 14px", fontSize: 12 }}
                title={!extra.active && !canGoLive ? "Set a price (or choose Custom quote) before turning this on" : undefined}
              >
                {extra.active ? "Turn off" : "Turn on"}
              </button>
            </div>

            {!extra.active && !canGoLive && (
              <p className="confirm-note" style={{ fontSize: 12, padding: "8px 12px" }}>
                No confirmed price yet. This stays hidden from customers until a real price is
                saved, or the pricing type is set to Custom quote.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
