"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = ["CITY", "NATIONAL_PARK", "LAKE", "MOUNTAIN", "AIRPORT", "HOTEL", "ATTRACTION", "CUSTOM"];
const VEHICLE_CATEGORIES = ["", "Sedan", "SUV"];

const EMPTY = {
  name: "",
  region: "",
  category: "CUSTOM",
  description: "",
  notes: "",
  recommendedVehicleCategory: "",
  lat: "",
  lng: "",
  published: false,
};

// Used for both /admin/destinations/new (destination is null) and
// /admin/destinations/[id] (destination is the existing record). Talks
// directly to the real /api/destinations routes, the same pattern as
// VehicleForm.js. A destination stays unpublished (hidden from the public
// trip planner and search) until an admin explicitly turns it on, exactly
// like a booking extra.
export default function DestinationForm({ destination }) {
  const router = useRouter();
  const isEdit = !!destination;
  const [form, setForm] = useState(
    isEdit
      ? {
          name: destination.name,
          region: destination.region || "",
          category: destination.category,
          description: destination.description || "",
          notes: destination.notes || "",
          recommendedVehicleCategory: destination.recommendedVehicleCategory || "",
          lat: destination.lat ?? "",
          lng: destination.lng ?? "",
          published: destination.published,
        }
      : EMPTY
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState("");

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function geocode() {
    if (!form.name) return;
    setGeocoding(true);
    setGeocodeError("");
    const query = form.region ? `${form.name}, ${form.region}, Rwanda` : `${form.name}, Rwanda`;
    try {
      const res = await fetch("/api/geo/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const body = await res.json().catch(() => ({}));
      if (!body.result) {
        setGeocodeError("Could not find coordinates for this name, try adding the region above and searching again, or enter coordinates manually.");
      } else {
        set("lat", body.result.lat.toFixed(6));
        set("lng", body.result.lng.toFixed(6));
      }
    } catch {
      setGeocodeError("The lookup service did not respond, enter coordinates manually or try again.");
    }
    setGeocoding(false);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    const payload = {
      ...form,
      recommendedVehicleCategory: form.recommendedVehicleCategory || null,
      lat: form.lat === "" ? null : Number(form.lat),
      lng: form.lng === "" ? null : Number(form.lng),
    };
    const res = await fetch(isEdit ? `/api/destinations/${destination.dbId}` : "/api/destinations", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Could not save this destination.");
      return;
    }
    if (isEdit) {
      setSaved(true);
      router.refresh();
    } else {
      const body = await res.json();
      router.push(`/admin/destinations/${body.destination.dbId}`);
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ maxWidth: 640 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <TextField label="Name" value={form.name} onChange={(v) => set("name", v)} required />
        <TextField label="Region" value={form.region} onChange={(v) => set("region", v)} />
        <SelectField label="Category" value={form.category} onChange={(v) => set("category", v)} options={CATEGORIES} />
        <SelectField
          label="Recommended vehicle category"
          value={form.recommendedVehicleCategory}
          onChange={(v) => set("recommendedVehicleCategory", v)}
          options={VEHICLE_CATEGORIES}
          optionLabels={{ "": "None" }}
        />
        <TextField label="Latitude" value={form.lat} onChange={(v) => set("lat", v)} />
        <TextField label="Longitude" value={form.lng} onChange={(v) => set("lng", v)} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: -8, marginBottom: 16 }}>
        <button type="button" className="btn-outline" style={{ padding: "6px 12px", fontSize: 12 }} onClick={geocode} disabled={geocoding || !form.name}>
          {geocoding ? "Looking up..." : "Look up coordinates"}
        </button>
        <p className="muted" style={{ fontSize: 11.5, margin: 0 }}>
          Uses a free public lookup (OpenStreetMap), always review the result before saving, it
          is a starting point, not a confirmed survey coordinate.
        </p>
      </div>
      {geocodeError && (
        <p className="confirm-note" style={{ display: "block", fontSize: 12, marginTop: -10, marginBottom: 16 }}>
          {geocodeError}
        </p>
      )}

      <div className="field" style={{ marginBottom: 16 }}>
        <label>Description</label>
        <textarea
          rows={4}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          style={{ border: "1px solid var(--line)", padding: 12, fontFamily: "inherit", fontSize: 14, width: "100%" }}
        />
      </div>

      <div className="field" style={{ marginBottom: 20 }}>
        <label>Internal notes (not shown publicly)</label>
        <textarea
          rows={2}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          style={{ border: "1px solid var(--line)", padding: 12, fontFamily: "inherit", fontSize: 14, width: "100%" }}
        />
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, marginBottom: 20, cursor: "pointer" }}>
        <input type="checkbox" checked={form.published} onChange={(e) => set("published", e.target.checked)} />
        Published (visible in the public trip planner and destination search)
      </label>

      {error && (
        <div className="confirm-note" style={{ display: "block", marginBottom: 16 }}>
          {error}
        </div>
      )}
      {saved && <div style={{ fontSize: 13, color: "var(--forest-dark)", marginBottom: 16 }}>Saved.</div>}

      <div style={{ display: "flex", gap: 12 }}>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving..." : isEdit ? "Save changes" : "Create destination"}
        </button>
      </div>
    </form>
  );
}

function TextField({ label, value, onChange, type = "text", required }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input type={type} value={value} required={required} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function SelectField({ label, value, onChange, options, optionLabels = {} }) {
  return (
    <div className="field">
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {optionLabels[o] || o}
          </option>
        ))}
      </select>
    </div>
  );
}
