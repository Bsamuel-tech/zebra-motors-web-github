"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = ["AVAILABLE", "RESERVED", "RENTED", "MAINTENANCE", "UNAVAILABLE", "ARCHIVED"];
const MILEAGE_POLICY_TYPES = ["UNLIMITED", "DAILY_ALLOWANCE", "TOTAL_ALLOWANCE"];

const EMPTY = {
  make: "",
  model: "",
  name: "",
  year: new Date().getFullYear(),
  category: "Sedan",
  transmission: "Automatic",
  fuel: "Petrol",
  drive: "2WD",
  doors: 4,
  seats: 5,
  luggage: "",
  dailyRateRWFMin: "",
  dailyRateRWFMax: "",
  badge: "",
  description: "",
  status: "AVAILABLE",
  mileagePolicyType: "UNLIMITED",
  includedKmPerDay: "",
  includedTotalKm: "",
  extraKmRateRWF: "",
};

// Used for both /admin/fleet/new (vehicle is null) and /admin/fleet/[id]
// (vehicle is the existing record). Talks directly to the real /api/vehicles
// routes, this is real admin editing (Rule 84), not a mockup.
export default function VehicleForm({ vehicle }) {
  const router = useRouter();
  const isEdit = !!vehicle;
  const [form, setForm] = useState(
    isEdit
      ? {
          make: vehicle.make,
          model: vehicle.model,
          name: vehicle.name,
          year: vehicle.year,
          category: vehicle.category,
          transmission: vehicle.transmission,
          fuel: vehicle.fuel,
          drive: vehicle.drive,
          doors: vehicle.doors,
          seats: vehicle.seats,
          luggage: vehicle.luggage,
          dailyRateRWFMin: vehicle.dailyRateRWFMin,
          dailyRateRWFMax: vehicle.dailyRateRWFMax,
          badge: vehicle.badge || "",
          description: vehicle.description,
          status: vehicle.status,
          mileagePolicyType: vehicle.mileagePolicyType || "UNLIMITED",
          includedKmPerDay: vehicle.includedKmPerDay ?? "",
          includedTotalKm: vehicle.includedTotalKm ?? "",
          extraKmRateRWF: vehicle.extraKmRateRWF ?? "",
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
      ...form,
      year: Number(form.year),
      doors: Number(form.doors),
      seats: Number(form.seats),
      dailyRateRWFMin: Number(form.dailyRateRWFMin),
      dailyRateRWFMax: Number(form.dailyRateRWFMax),
      includedKmPerDay:
        form.mileagePolicyType === "DAILY_ALLOWANCE" && form.includedKmPerDay !== ""
          ? Number(form.includedKmPerDay)
          : null,
      includedTotalKm:
        form.mileagePolicyType === "TOTAL_ALLOWANCE" && form.includedTotalKm !== ""
          ? Number(form.includedTotalKm)
          : null,
      extraKmRateRWF:
        form.mileagePolicyType !== "UNLIMITED" && form.extraKmRateRWF !== ""
          ? Number(form.extraKmRateRWF)
          : null,
    };
    const res = await fetch(isEdit ? `/api/vehicles/${vehicle.dbId}` : "/api/vehicles", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Could not save this vehicle.");
      return;
    }
    if (isEdit) {
      setSaved(true);
      router.refresh();
    } else {
      router.push("/admin/fleet");
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ maxWidth: 640 }}>
      <div className="grid-2" style={{ gap: 16, marginBottom: 16 }}>
        <TextField label="Make" value={form.make} onChange={(v) => set("make", v)} required />
        <TextField label="Model" value={form.model} onChange={(v) => set("model", v)} required />
        <TextField label="Display name" value={form.name} onChange={(v) => set("name", v)} required />
        <TextField label="Year" type="number" value={form.year} onChange={(v) => set("year", v)} required />
        <SelectField label="Category" value={form.category} onChange={(v) => set("category", v)} options={["Sedan", "SUV"]} />
        <SelectField label="Transmission" value={form.transmission} onChange={(v) => set("transmission", v)} options={["Automatic", "Manual"]} />
        <SelectField label="Fuel" value={form.fuel} onChange={(v) => set("fuel", v)} options={["Petrol", "Diesel", "Hybrid"]} />
        <TextField label="Drive" value={form.drive} onChange={(v) => set("drive", v)} />
        <TextField label="Doors" type="number" value={form.doors} onChange={(v) => set("doors", v)} required />
        <TextField label="Seats" type="number" value={form.seats} onChange={(v) => set("seats", v)} required />
        <TextField label="Luggage" value={form.luggage} onChange={(v) => set("luggage", v)} />
        <TextField label="Badge" value={form.badge} onChange={(v) => set("badge", v)} />
        <TextField
          label="Daily rate min (RWF)"
          type="number"
          value={form.dailyRateRWFMin}
          onChange={(v) => set("dailyRateRWFMin", v)}
          required
        />
        <TextField
          label="Daily rate max (RWF)"
          type="number"
          value={form.dailyRateRWFMax}
          onChange={(v) => set("dailyRateRWFMax", v)}
          required
        />
        <SelectField label="Status" value={form.status} onChange={(v) => set("status", v)} options={STATUSES} />
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Mileage policy</div>
        <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
          Compared against the real pickup and return odometer readings recorded for each
          booking, never an estimate. Defaults to unlimited until set here.
        </p>
        <div className="grid-2" style={{ gap: 16 }}>
          <SelectField
            label="Policy type"
            value={form.mileagePolicyType}
            onChange={(v) => set("mileagePolicyType", v)}
            options={MILEAGE_POLICY_TYPES}
          />
          {form.mileagePolicyType === "DAILY_ALLOWANCE" && (
            <TextField
              label="Included km per day"
              type="number"
              value={form.includedKmPerDay}
              onChange={(v) => set("includedKmPerDay", v)}
            />
          )}
          {form.mileagePolicyType === "TOTAL_ALLOWANCE" && (
            <TextField
              label="Included km, total rental"
              type="number"
              value={form.includedTotalKm}
              onChange={(v) => set("includedTotalKm", v)}
            />
          )}
          {form.mileagePolicyType !== "UNLIMITED" && (
            <TextField
              label="Extra km rate (RWF)"
              type="number"
              value={form.extraKmRateRWF}
              onChange={(v) => set("extraKmRateRWF", v)}
            />
          )}
        </div>
      </div>

      <div className="field" style={{ marginBottom: 20 }}>
        <label>Description</label>
        <textarea
          rows={4}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          style={{ border: "1px solid var(--line)", padding: 12, fontFamily: "inherit", fontSize: 14, width: "100%" }}
        />
      </div>

      {error && (
        <div className="confirm-note" style={{ display: "block", marginBottom: 16 }}>
          {error}
        </div>
      )}
      {saved && (
        <div style={{ fontSize: 13, color: "var(--forest-dark)", marginBottom: 16 }}>Saved.</div>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving..." : isEdit ? "Save changes" : "Create vehicle"}
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

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="field">
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
