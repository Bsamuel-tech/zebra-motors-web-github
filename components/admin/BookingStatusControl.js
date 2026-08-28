"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"];

export default function BookingStatusControl({ bookingId, status }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function onChange(e) {
    const next = e.target.value;
    setSaving(true);
    await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <select value={status} onChange={onChange} disabled={saving} style={{ fontSize: 12.5, padding: "4px 6px" }}>
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
