"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReviewsTable({ reviews }) {
  const router = useRouter();
  const [pending, setPending] = useState(null);

  async function togglePublished(review) {
    setPending(review.id);
    await fetch(`/api/reviews/${review.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !review.published }),
    });
    setPending(null);
    router.refresh();
  }

  return (
    <div className="card">
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
            <th style={{ padding: "12px 16px" }}>Reviewer</th>
            <th style={{ padding: "12px 16px" }}>Rating</th>
            <th style={{ padding: "12px 16px" }}>Text</th>
            <th style={{ padding: "12px 16px" }}>Source</th>
            <th style={{ padding: "12px 16px" }}>Status</th>
            <th style={{ padding: "12px 16px" }}></th>
          </tr>
        </thead>
        <tbody>
          {reviews.map((r) => (
            <tr key={r.id} style={{ borderBottom: "1px solid var(--line)" }}>
              <td style={{ padding: "12px 16px", fontWeight: 600 }}>{r.name}</td>
              <td style={{ padding: "12px 16px" }}>{"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}</td>
              <td style={{ padding: "12px 16px", maxWidth: 340 }}>{r.text}</td>
              <td style={{ padding: "12px 16px", color: "var(--muted)" }}>{r.source}</td>
              <td style={{ padding: "12px 16px" }}>
                <span className={`badge ${r.published ? "badge-forest" : "badge-muted"}`}>
                  {r.published ? "Published" : "Hidden"}
                </span>
              </td>
              <td style={{ padding: "12px 16px", textAlign: "right" }}>
                <button
                  onClick={() => togglePublished(r)}
                  disabled={pending === r.id}
                  style={{ background: "none", border: "1px solid var(--line)", padding: "6px 12px", fontSize: 12.5, cursor: "pointer" }}
                >
                  {r.published ? "Unpublish" : "Publish"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
