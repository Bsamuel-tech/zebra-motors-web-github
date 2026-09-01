"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Records a real odometer reading at vehicle pickup and/or return. Each
// field saves independently since pickup usually happens well before
// return, this never fills the other field with a guess.
export default function OdometerControl({ bookingId, pickupOdometerKm, returnOdometerKm }) {
  const router = useRouter();
  const [pickup, setPickup] = useState(pickupOdometerKm ?? "");
  const [ret, setRet] = useState(returnOdometerKm ?? "");
  const [saving, setSaving] = useState(false);

  async function save(field, value) {
    setSaving(true);
    await fetch(`/api/bookings/${bookingId}/odometer`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value === "" ? null : Number(value) }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
      <div className="field" style={{ margin: 0 }}>
        <label style={{ fontSize: 11 }}>Pickup odometer (km)</label>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            type="number"
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            style={{ fontSize: 12.5, padding: "7px 9px", width: 120 }}
          />
          <button type="button" className="btn-outline" style={{ fontSize: 12, padding: "6px 10px" }} disabled={saving} onClick={() => save("pickupOdometerKm", pickup)}>
            Save
          </button>
        </div>
      </div>
      <div className="field" style={{ margin: 0 }}>
        <label style={{ fontSize: 11 }}>Return odometer (km)</label>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            type="number"
            value={ret}
            onChange={(e) => setRet(e.target.value)}
            style={{ fontSize: 12.5, padding: "7px 9px", width: 120 }}
          />
          <button type="button" className="btn-outline" style={{ fontSize: 12, padding: "6px 10px" }} disabled={saving} onClick={() => save("returnOdometerKm", ret)}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
