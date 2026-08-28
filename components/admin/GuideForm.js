"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = ["draft", "published", "scheduled", "archived"];

const EMPTY = { title: "", excerpt: "", category: "general", status: "draft", body: "" };

// Used for both /admin/guides/new (article is null) and /admin/guides/[id].
// Talks directly to the real /api/guides routes. "body" is edited as one
// paragraph per line and stored as a JSON array (Section 13/46).
export default function GuideForm({ article }) {
  const router = useRouter();
  const isEdit = !!article;
  const [form, setForm] = useState(
    isEdit
      ? {
          title: article.title,
          excerpt: article.excerpt,
          category: article.category,
          status: article.status,
          body: (article.body || []).join("\n\n"),
        }
      : EMPTY
  );
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
    const payload = {
      title: form.title,
      excerpt: form.excerpt,
      category: form.category,
      status: form.status,
      body: form.body
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean),
    };
    const res = await fetch(isEdit ? `/api/guides/${article.id}` : "/api/guides", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
      router.push("/admin/guides");
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ maxWidth: 680 }}>
      <div className="field" style={{ marginBottom: 16 }}>
        <label>Title</label>
        <input type="text" value={form.title} required onChange={(e) => set("title", e.target.value)} />
      </div>

      <div className="field" style={{ marginBottom: 16 }}>
        <label>Excerpt</label>
        <textarea
          rows={2}
          value={form.excerpt}
          required
          onChange={(e) => set("excerpt", e.target.value)}
          style={{ border: "1px solid var(--line)", padding: 12, fontFamily: "inherit", fontSize: 14, width: "100%" }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="field">
          <label>Category</label>
          <input type="text" value={form.category} onChange={(e) => set("category", e.target.value)} />
        </div>
        <div className="field">
          <label>Status</label>
          <select value={form.status} onChange={(e) => set("status", e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field" style={{ marginBottom: 20 }}>
        <label>Body (one paragraph per blank-line-separated block)</label>
        <textarea
          rows={12}
          value={form.body}
          onChange={(e) => set("body", e.target.value)}
          style={{ border: "1px solid var(--line)", padding: 12, fontFamily: "inherit", fontSize: 14, width: "100%" }}
        />
      </div>

      {error && (
        <div className="confirm-note" style={{ display: "block", marginBottom: 16 }}>
          {error}
        </div>
      )}
      {saved && <div style={{ fontSize: 13, color: "var(--forest-dark)", marginBottom: 16 }}>Saved.</div>}

      <div style={{ display: "flex", gap: 12 }}>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving..." : isEdit ? "Save changes" : "Create article"}
        </button>
      </div>
    </form>
  );
}
