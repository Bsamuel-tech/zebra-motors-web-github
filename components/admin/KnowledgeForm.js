"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Kept as a plain local constant, deliberately not imported from
// lib/db/knowledge.js: that file pulls in lib/db/client.js, which imports
// node:sqlite at module scope, a Node-only built-in with no browser
// equivalent. Importing it from this "use client" component would break
// the client bundle. The list is duplicated in exactly one other place,
// lib/db/knowledge.js's own KNOWLEDGE_CATEGORIES export, kept in sync by
// hand since it changes rarely.
const KNOWLEDGE_CATEGORIES = [
  "FLEET",
  "POLICIES",
  "INSURANCE",
  "AIRPORT_PICKUP",
  "RENTAL_REQUIREMENTS",
  "DRIVING_IN_RWANDA",
  "DESTINATIONS",
  "FAQ",
  "CANCELLATION",
  "MILEAGE",
  "CHAUFFEUR",
  "TERMS",
];

const EMPTY = { category: "FAQ", title: "", body: "", published: false };

// Used for both /admin/knowledge/new (article is null) and
// /admin/knowledge/[id]. Talks directly to the real /api/knowledge routes.
export default function KnowledgeForm({ article }) {
  const router = useRouter();
  const isEdit = !!article;
  const [form, setForm] = useState(isEdit ? { ...article } : EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    const res = await fetch(isEdit ? `/api/knowledge/${article.id}` : "/api/knowledge", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Could not save this article.");
      return;
    }
    if (isEdit) {
      setSaved(true);
      router.refresh();
    } else {
      router.push("/admin/knowledge");
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ maxWidth: 720 }}>
      <div className="field" style={{ marginBottom: 16 }}>
        <label>Title</label>
        <input type="text" value={form.title} required onChange={(e) => set("title", e.target.value)} />
      </div>
      <div className="field" style={{ marginBottom: 16 }}>
        <label>Category</label>
        <select value={form.category} onChange={(e) => set("category", e.target.value)}>
          {KNOWLEDGE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="field" style={{ marginBottom: 16 }}>
        <label>Policy text</label>
        <textarea
          rows={10}
          value={form.body}
          required
          onChange={(e) => set("body", e.target.value)}
          placeholder="Write the real Zebra policy text here, plain language, this is exactly what the AI will quote to a customer."
          style={{ border: "1px solid var(--line)", padding: 12, fontFamily: "inherit", fontSize: 14, width: "100%" }}
        />
      </div>
      <div className="field" style={{ marginBottom: 20 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={!!form.published} onChange={(e) => set("published", e.target.checked)} />
          Published (visible to Zebra Assistant Support and any public listing)
        </label>
      </div>

      {error && (
        <div className="confirm-note" style={{ display: "block", marginBottom: 16 }}>
          {error}
        </div>
      )}
      {saved && <div style={{ fontSize: 13, color: "var(--forest-dark)", marginBottom: 16 }}>Saved.</div>}

      <div style={{ display: "flex", gap: 12 }}>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving..." : isEdit ? "Save changes" : "Add article"}
        </button>
      </div>
    </form>
  );
}
