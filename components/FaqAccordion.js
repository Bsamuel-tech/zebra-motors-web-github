"use client";

import { useState } from "react";

// Accepts DB-backed faqs as a prop (fetched by app/(site)/faq/page.js),
// same accordion behaviour as before the database was wired in.
export default function FaqAccordion({ faqs }) {
  const [open, setOpen] = useState(0);

  return (
    <div>
      {faqs.map((item, i) => (
        <div key={item.id} style={{ borderBottom: "1px solid var(--line)" }}>
          <button
            onClick={() => setOpen(open === i ? -1 : i)}
            style={{
              width: "100%",
              textAlign: "left",
              background: "none",
              border: "none",
              padding: "18px 0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
              fontSize: 15,
              fontWeight: 600,
              color: "var(--ink)",
            }}
          >
            {item.q}
            <span style={{ fontSize: 18, color: "var(--muted)" }}>{open === i ? "−" : "+"}</span>
          </button>
          {open === i && (
            <p style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.7, paddingBottom: 18, margin: 0 }}>
              {item.a}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
