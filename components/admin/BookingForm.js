"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SERVICE_TYPES = ["self-drive", "with-driver"];

const EMPTY = {
  vehicleDbId: "",
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  pickupDate: "",
  returnDate: "",
  serviceType: "self-drive",
  totalRWF: "",
  depositRWF: "",
};

// Creates a real booking (POST /api/bookings), is_demo = 0, distinct from
// the public site's booking flow which only ever submits a lead. This is
// for a booking Zebra staff already agreed with a customer by phone or in
// person and are recording for real.
export default function BookingForm({ vehicles }) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      ...form,
      totalRWF: Number(form.totalRWF),
      depositRWF: form.depositRWF !== "" ? Number(form.depositRWF) : null,
    };
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Could not create this booking.");
      return;
    }
    router.push("/admin/bookings");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} style={{ maxWidth: 560 }}>
      <div className="field" style={{ marginBottom: 16 }}>
        <label>Vehicle</label>
        <select value={form.vehicleDbId} onChange={(e) => set("vehicleDbId", e.target.value)} required>
          <option value="">Select a vehicle</option>
          {vehicles.map((v) => (
            <option key={v.dbId} value={v.dbId}>
              {v.name} ({v.status})
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <TextField label="Customer name" value={form.customerName} onChange={(v) => set("customerName", v)} required />
        <TextField label="Customer email" type="email" value={form.customerEmail} onChange={(v) => set("customerEmail", v)} required />
        <TextField label="Customer phone" value={form.customerPhone} onChange={(v) => set("customerPhone", v)} />
        <div className="field">
          <label>Service type</label>
          <select value={form.serviceType} onChange={(e) => set("serviceType", e.target.value)}>
            {SERVICE_TYPES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <TextField label="Pickup date" type="date" value={form.pickupDate} onChange={(v) => set("pickupDate", v)} required />
        <TextField label="Return date" type="date" value={form.returnDate} onChange={(v) => set("returnDate", v)} required />
        <TextField label="Total (RWF)" type="number" value={form.totalRWF} onChange={(v) => set("totalRWF", v)} required />
        <TextField label="Deposit (RWF)" type="number" value={form.depositRWF} onChange={(v) => set("depositRWF", v)} />
      </div>

      {error && (
        <div className="confirm-note" style={{ display: "block", marginBottom: 16 }}>
          {error}
        </div>
      )}

      <button type="submit" className="btn-primary" disabled={saving}>
        {saving ? "Saving..." : "Create booking"}
      </button>
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
