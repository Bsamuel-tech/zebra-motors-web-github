import Link from "next/link";
import Photo from "@/components/Photo";

export const metadata = { title: "My Bookings, Zebra Motors" };

export default function BookingsPage() {
  return (
    <div className="wrap" style={{ paddingTop: 30, paddingBottom: 70, maxWidth: 700 }}>
      <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
        <Link href="/account">Account</Link> / Bookings
      </div>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>Booking ZM-2026-08341</h1>

      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 16, marginBottom: 18, paddingBottom: 18, borderBottom: "1px solid var(--line)" }}>
          <Photo height={80} style={{ width: 110, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 17, fontWeight: 600 }}>KIA Sorento</div>
            <div className="muted" style={{ fontSize: 13 }}>SUV · Automatic · Self-drive</div>
          </div>
        </div>
        <Row label="Pickup" value="14 Sep 2026, 14:30 · Kigali Airport" />
        <Row label="Return" value="22 Sep 2026, 10:00" />
        <Row label="Status" value="Confirmed, deposit paid" />
        <Row label="Total" value="$359 ($80 paid, $279 due on pickup)" last />
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button className="btn-outline">Add flight details</button>
        <button className="btn-outline">Download confirmation (PDF)</button>
        <button className="btn-outline" style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>
          Cancel booking
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, last }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "var(--ink-soft)", padding: "8px 0", borderBottom: last ? "none" : "1px solid var(--line)" }}>
      <span>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}
