"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const EMPTY = { name: "", duration: "", summary: "", includes: "", bestFor: "", published: true };

// Used for both /admin/packages/new (pkg is null) and /admin/packages/[id].
// Talks directly to the real /api/packages routes. "includes" and "bestFor"
// are edited as comma-separated text and stored as JSON arrays in the
// database (Section 12).
export default function PackageForm({ pkg }) {
  const router = useRouter();
  const isEdit = !!pkg;
  const [form, setForm] = useState(
    isEdit
      ? {
          name: pkg.name,
          duration: pkg.duration,
          summary: pkg.summary,
          includes: pkg.includes.join(", "),
          bestFor: pkg.bestFor.join(", "),
          published: pkg.published,
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
      name: form.name,
      duration: form.duration,
      summary: form.summary,
      includes: form.includes.split(",").map((s) => s.trim()).filter(Boolean),
      bestFor: form.bestFor.split(",").map((s) => s.trim()).filter(Boolean),
      published: form.published,
    };
    const res = await fetch(isEdit ? `/api/packages/${pkg.id}` : "/api/packages", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Could not save this package.");
      return;
    }
    if (isEdit) {
      setSaved(true);
      router.refresh();
    } else {
      router.push("/admin/packages");
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ maxWidth: 640 }}>
      <div className="grid-2" style={{ gap: 16, marginBottom: 16 }}>
        <div className="field">
          <label>Name</label>
          <input type="text" value={form.name} required onChange={(e) => set("name", e.target.value)} />
        </div>
        <div className="field">
          <label>Duration</label>
          <input type="text" value={form.duration} required onChange={(e) => set("duration", e.target.value)} />
        </div>
      </div>

      <div className="field" style={{ marginBottom: 16 }}>
        <label>Summary</label>
        <textarea
          rows={3}
          value={form.summary}
          required
          onChange={(e) => set("summary", e.target.value)}
          style={{ border: "1px solid var(--line)", padding: 12, fontFamily: "inherit", fontSize: 14, width: "100%" }}
        />
      </div>

      <div className="field" style={{ marginBottom: 16 }}>
        <label>Includes (comma separated)</label>
        <input type="text" value={form.includes} onChange={(e) => set("includes", e.target.value)} />
      </div>

      <div className="field" style={{ marginBottom: 20 }}>
        <label>Best for (comma separated)</label>
        <input type="text" value={form.bestFor} onChange={(e) => set("bestFor", e.target.value)} />
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, marginBottom: 20 }}>
        <input type="checkbox" checked={form.published} onChange={(e) => set("published", e.target.checked)} />
        Published on the public site
      </label>

      {error && (
        <div className="confirm-note" style={{ display: "block", marginBottom: 16 }}>
          {error}
        </div>
      )}
      {saved && <div style={{ fontSize: 13, color: "var(--forest-dark)", marginBottom: 16 }}>Saved.</div>}

      <div style={{ display: "flex", gap: 12 }}>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving..." : isEdit ? "Save changes" : "Create package"}
        </button>
      </div>
    </form>
  );
}
