"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const FIELDS = [
  { key: "companyName", label: "Company name" },
  { key: "legalName", label: "Legal name" },
  { key: "phone", label: "Phone (used for tel: links)" },
  { key: "phoneDisplay", label: "Phone (as displayed)" },
  { key: "whatsapp", label: "WhatsApp number" },
  { key: "email", label: "Email" },
  { key: "address", label: "Address" },
  { key: "city", label: "City" },
  { key: "country", label: "Country" },
  { key: "timezone", label: "Timezone" },
  { key: "businessHours", label: "Business hours" },
  { key: "emergencyPhone", label: "Emergency phone" },
];

// Real admin editing of the single BusinessSettings row (Rule 6, Rule 84).
// Saving here immediately changes what every public page shows, since they
// all read the same database row through lib/db/settings.js.
export default function SettingsForm({ settings }) {
  const router = useRouter();
  const [form, setForm] = useState(
    Object.fromEntries(FIELDS.map((f) => [f.key, settings[f.key] || ""]))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} style={{ maxWidth: 560 }}>
      <div className="grid-2" style={{ gap: 16, marginBottom: 20 }}>
        {FIELDS.map((f) => (
          <div className="field" key={f.key}>
            <label>{f.label}</label>
            <input
              value={form[f.key]}
              onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      {saved && (
        <div style={{ fontSize: 13, color: "var(--forest-dark)", marginBottom: 14 }}>
          Saved. The public site now shows these values.
        </div>
      )}
      <button type="submit" className="btn-primary" disabled={saving}>
        {saving ? "Saving..." : "Save settings"}
      </button>
    </form>
  );
}
