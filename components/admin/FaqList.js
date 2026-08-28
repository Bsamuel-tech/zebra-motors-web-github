"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FaqList({ faqs }) {
  const router = useRouter();
  const [pending, setPending] = useState(null);

  async function togglePublished(item) {
    setPending(item.id);
    await fetch(`/api/faq/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !item.published }),
    });
    setPending(null);
    router.refresh();
  }

  async function remove(item) {
    if (!confirm(`Delete the FAQ entry "${item.q}"? This cannot be undone.`)) return;
    setPending(item.id);
    await fetch(`/api/faq/${item.id}`, { method: "DELETE" });
    setPending(null);
    router.refresh();
  }

  return (
    <div className="card">
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
            <th style={{ padding: "12px 16px" }}>Question</th>
            <th style={{ padding: "12px 16px" }}>Category</th>
            <th style={{ padding: "12px 16px" }}>Order</th>
            <th style={{ padding: "12px 16px" }}>Status</th>
            <th style={{ padding: "12px 16px" }}></th>
          </tr>
        </thead>
        <tbody>
          {faqs.map((f) => (
            <tr key={f.id} style={{ borderBottom: "1px solid var(--line)" }}>
              <td style={{ padding: "12px 16px", fontWeight: 600, maxWidth: 360 }}>{f.q}</td>
              <td style={{ padding: "12px 16px", color: "var(--muted)" }}>{f.category}</td>
              <td style={{ padding: "12px 16px" }}>{f.sortOrder}</td>
              <td style={{ padding: "12px 16px" }}>
                <span className={`badge ${f.published ? "badge-forest" : "badge-muted"}`}>
                  {f.published ? "Published" : "Hidden"}
                </span>
              </td>
              <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                <Link href={`/admin/faq/${f.id}`} style={{ fontSize: 13, fontWeight: 600, marginRight: 14 }}>
                  Edit
                </Link>
                <button
                  onClick={() => togglePublished(f)}
                  disabled={pending === f.id}
                  style={{ background: "none", border: "1px solid var(--line)", padding: "6px 12px", fontSize: 12.5, cursor: "pointer", marginRight: 8 }}
                >
                  {f.published ? "Unpublish" : "Publish"}
                </button>
                <button
                  onClick={() => remove(f)}
                  disabled={pending === f.id}
                  style={{ background: "none", border: "1px solid var(--line)", padding: "6px 12px", fontSize: 12.5, cursor: "pointer", color: "#a33" }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
