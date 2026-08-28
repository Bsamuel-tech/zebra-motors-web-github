"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const EMPTY = { question: "", answer: "", category: "general", sortOrder: 0 };

// Used for both /admin/faq/new (faq is null) and /admin/faq/[id]. Talks
// directly to the real /api/faq routes.
export default function FaqForm({ faq }) {
  const router = useRouter();
  const isEdit = !!faq;
  const [form, setForm] = useState(
    isEdit
      ? { question: faq.q, answer: faq.a, category: faq.category, sortOrder: faq.sortOrder }
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
    const payload = isEdit
      ? { q: form.question, a: form.answer, category: form.category, sortOrder: Number(form.sortOrder) }
      : { ...form, sortOrder: Number(form.sortOrder) };
    const res = await fetch(isEdit ? `/api/faq/${faq.id}` : "/api/faq", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Could not save this FAQ entry.");
      return;
    }
    if (isEdit) {
      setSaved(true);
      router.refresh();
    } else {
      router.push("/admin/faq");
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ maxWidth: 640 }}>
      <div className="field" style={{ marginBottom: 16 }}>
        <label>Question</label>
        <input type="text" value={form.question} required onChange={(e) => set("question", e.target.value)} />
      </div>
      <div className="field" style={{ marginBottom: 16 }}>
        <label>Answer</label>
        <textarea
          rows={4}
          value={form.answer}
          required
          onChange={(e) => set("answer", e.target.value)}
          style={{ border: "1px solid var(--line)", padding: 12, fontFamily: "inherit", fontSize: 14, width: "100%" }}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div className="field">
          <label>Category</label>
          <input type="text" value={form.category} onChange={(e) => set("category", e.target.value)} />
        </div>
        <div className="field">
          <label>Sort order</label>
          <input type="number" value={form.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} />
        </div>
      </div>

      {error && (
        <div className="confirm-note" style={{ display: "block", marginBottom: 16 }}>
          {error}
        </div>
      )}
      {saved && <div style={{ fontSize: 13, color: "var(--forest-dark)", marginBottom: 16 }}>Saved.</div>}

      <div style={{ display: "flex", gap: 12 }}>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving..." : isEdit ? "Save changes" : "Add FAQ"}
        </button>
      </div>
    </form>
  );
}
