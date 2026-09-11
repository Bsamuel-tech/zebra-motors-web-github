"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function KnowledgeList({ articles }) {
  const router = useRouter();
  const [pending, setPending] = useState(null);

  async function togglePublished(item) {
    setPending(item.id);
    await fetch(`/api/knowledge/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !item.published }),
    });
    setPending(null);
    router.refresh();
  }

  async function remove(item) {
    if (!confirm(`Unpublish "${item.title}"? It stays saved, but Zebra Assistant Support and any listing will stop showing it.`)) return;
    setPending(item.id);
    await fetch(`/api/knowledge/${item.id}`, { method: "DELETE" });
    setPending(null);
    router.refresh();
  }

  if (articles.length === 0) {
    return (
      <div className="card" style={{ padding: 24 }}>
        <p className="muted" style={{ fontSize: 13.5 }}>
          No knowledge articles yet. Add the first one, real Zebra policy text only, nothing
          invented here.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
            <th style={{ padding: "12px 16px" }}>Title</th>
            <th style={{ padding: "12px 16px" }}>Category</th>
            <th style={{ padding: "12px 16px" }}>Status</th>
            <th style={{ padding: "12px 16px" }}></th>
          </tr>
        </thead>
        <tbody>
          {articles.map((a) => (
            <tr key={a.id} style={{ borderBottom: "1px solid var(--line)" }}>
              <td style={{ padding: "12px 16px", fontWeight: 600, maxWidth: 360 }}>{a.title}</td>
              <td style={{ padding: "12px 16px", color: "var(--muted)" }}>{a.category}</td>
              <td style={{ padding: "12px 16px" }}>
                <span className={`badge ${a.published ? "badge-forest" : "badge-muted"}`}>
                  {a.published ? "Published" : "Draft"}
                </span>
              </td>
              <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                <Link href={`/admin/knowledge/${a.id}`} style={{ fontSize: 13, fontWeight: 600, marginRight: 14 }}>
                  Edit
                </Link>
                <button
                  onClick={() => togglePublished(a)}
                  disabled={pending === a.id}
                  style={{ background: "none", border: "1px solid var(--line)", padding: "6px 12px", fontSize: 12.5, cursor: "pointer", marginRight: 8 }}
                >
                  {a.published ? "Unpublish" : "Publish"}
                </button>
                <button
                  onClick={() => remove(a)}
                  disabled={pending === a.id}
                  style={{ background: "none", border: "1px solid var(--line)", padding: "6px 12px", fontSize: 12.5, cursor: "pointer" }}
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
