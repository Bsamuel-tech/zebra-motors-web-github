"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TYPE_OPTIONS = ["service", "repair", "inspection", "other"];
const STATUS_BADGE = {
  SCHEDULED: "badge-sand",
  IN_PROGRESS: "badge-ink",
  DONE: "badge-forest",
  CANCELLED: "badge-muted",
};

// Real service and repair history for one vehicle. Creating a record here
// never invents a schedule, cost, or odometer reading, every field is
// staff-entered. Moving a record to "In progress" sets the vehicle's own
// status to MAINTENANCE automatically (see lib/db/maintenance.js), so this
// stays in sync with the Fleet list without a second manual step.
export default function MaintenanceManager({ vehicleId, records }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ type: "service", description: "", scheduledDate: "", costRWF: "", odometerKm: "" });

  async function addRecord(e) {
    e.preventDefault();
    setPending(true);
    setError("");
    const res = await fetch("/api/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleId, ...form }),
    });
    setPending(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Could not add this record.");
      return;
    }
    setForm({ type: "service", description: "", scheduledDate: "", costRWF: "", odometerKm: "" });
    router.refresh();
  }

  async function setStatus(record, status) {
    setPending(true);
    await fetch(`/api/maintenance/${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        status === "DONE" ? { status, completedDate: new Date().toISOString().slice(0, 10) } : { status }
      ),
    });
    setPending(false);
    router.refresh();
  }

  return (
    <div style={{ maxWidth: 640, marginTop: 32 }}>
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Maintenance history</h2>

      {records.length === 0 ? (
        <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
          No maintenance records for this vehicle yet.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {records.map((r) => (
            <div key={r.id} className="card" style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, textTransform: "capitalize" }}>{r.type}</div>
                <span className={`badge ${STATUS_BADGE[r.status] || "badge-muted"}`}>{r.status.replace("_", " ")}</span>
              </div>
              {r.description && <p style={{ fontSize: 13, marginBottom: 6 }}>{r.description}</p>}
              <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                {r.scheduledDate ? `Scheduled ${r.scheduledDate}` : "No scheduled date"}
                {r.completedDate ? ` · Completed ${r.completedDate}` : ""}
                {r.costRWF != null ? ` · RWF ${Number(r.costRWF).toLocaleString("en-US")}` : ""}
                {r.odometerKm != null ? ` · ${Number(r.odometerKm).toLocaleString("en-US")} km` : ""}
              </div>
              {r.status !== "DONE" && r.status !== "CANCELLED" && (
                <div style={{ display: "flex", gap: 8 }}>
                  {r.status === "SCHEDULED" && (
                    <button
                      onClick={() => setStatus(r, "IN_PROGRESS")}
                      disabled={pending}
                      style={{ background: "none", border: "1px solid var(--line)", padding: "5px 10px", fontSize: 11.5, cursor: "pointer" }}
                    >
                      Start
                    </button>
                  )}
                  <button
                    onClick={() => setStatus(r, "DONE")}
                    disabled={pending}
                    style={{ background: "none", border: "1px solid var(--line)", padding: "5px 10px", fontSize: 11.5, cursor: "pointer" }}
                  >
                    Mark done
                  </button>
                  <button
                    onClick={() => setStatus(r, "CANCELLED")}
                    disabled={pending}
                    style={{ background: "none", border: "1px solid var(--line)", padding: "5px 10px", fontSize: 11.5, cursor: "pointer", color: "#a33" }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={addRecord} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="grid-2">
          <div className="field">
            <label>Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Scheduled date</label>
            <input type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} />
          </div>
        </div>
        <div className="field">
          <label>Description</label>
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Oil change and brake check" />
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Estimated cost (RWF, optional)</label>
            <input type="number" min="0" value={form.costRWF} onChange={(e) => setForm({ ...form, costRWF: e.target.value })} />
          </div>
          <div className="field">
            <label>Odometer (km, optional)</label>
            <input type="number" min="0" value={form.odometerKm} onChange={(e) => setForm({ ...form, odometerKm: e.target.value })} />
          </div>
        </div>
        {error && <div className="confirm-note" style={{ display: "block" }}>{error}</div>}
        <div>
          <button type="submit" className="btn-primary" disabled={pending}>
            Add maintenance record
          </button>
        </div>
      </form>
    </div>
  );
}
