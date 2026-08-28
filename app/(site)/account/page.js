import Link from "next/link";
import Photo from "@/components/Photo";

export const metadata = { title: "My Account, Zebra Motors" };

const NAV = ["Bookings", "Documents", "Payments & invoices", "Saved vehicles", "Reviews", "Profile", "Support"];

export default function AccountPage() {
  return (
    <div className="wrap" style={{ paddingTop: 30, paddingBottom: 70 }}>
      <div style={{ display: "flex", gap: 36, flexWrap: "wrap" }}>
        <div style={{ width: 220, flexShrink: 0 }}>
          {NAV.map((n, i) => (
            <div
              key={n}
              style={{
                padding: "12px 16px",
                fontSize: 14,
                color: i === 0 ? "var(--ink)" : "var(--ink-soft)",
                fontWeight: i === 0 ? 600 : 400,
                background: i === 0 ? "var(--paper-alt)" : "transparent",
              }}
            >
              {n}
            </div>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 280 }}>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>Welcome back, Aline</h1>
          <p className="muted" style={{ fontSize: 14, marginBottom: 26 }}>
            Your upcoming trip and rental history, in one place.
          </p>

          <div className="card" style={{ padding: 22, display: "flex", gap: 18, alignItems: "center", marginBottom: 34, flexWrap: "wrap" }}>
            <Photo height={90} style={{ width: 130, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <span className="badge badge-forest" style={{ marginBottom: 8 }}>Upcoming, in 12 days</span>
              <div style={{ fontSize: 17, fontWeight: 600, margin: "8px 0 4px 0" }}>KIA Sorento · 14-22 Sep 2026</div>
              <div className="muted" style={{ fontSize: 13 }}>Kigali Airport pickup · Self-drive · Booking ZM-2026-08341</div>
            </div>
            <Link href="/account/bookings" style={{ fontSize: 13.5, fontWeight: 600 }}>
              View booking →
            </Link>
          </div>

          <h2 style={{ fontSize: 18, marginBottom: 14 }}>Past rentals</h2>
          <div style={{ border: "1px solid var(--line)", marginBottom: 34 }}>
            {[
              { vehicle: "Toyota Corolla", dates: "3-6 Mar 2026 · Kigali", status: "Completed", action: "Leave a review" },
              { vehicle: "KIA K5", dates: "18-20 Nov 2025 · Kigali", status: "Reviewed ★★★★★", action: null },
            ].map((r, i) => (
              <div
                key={r.vehicle + i}
                style={{
                  padding: "16px 18px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: i === 0 ? "1px solid var(--line)" : "none",
                  background: "#fff",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <Photo height={42} style={{ width: 56, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{r.vehicle}</div>
                    <div className="muted" style={{ fontSize: 12.5 }}>{r.dates}</div>
                  </div>
                </div>
                <span className={`badge ${r.status.startsWith("Reviewed") ? "badge-forest" : "badge-muted"}`}>{r.status}</span>
                {r.action && <a href="#" style={{ fontSize: 13, fontWeight: 600 }}>{r.action}</a>}
                <a href="#" style={{ fontSize: 13, fontWeight: 600 }}>Receipt</a>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 18, marginBottom: 14 }}>Documents</h2>
          <div className="grid-2">
            <div className="card" style={{ padding: 16, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13.5 }}>Driving licence</span>
              <span style={{ fontSize: 12, color: "var(--forest-dark)", fontWeight: 600 }}>Uploaded</span>
            </div>
            <div className="card" style={{ padding: 16, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13.5 }}>Passport</span>
              <span style={{ fontSize: 12, color: "var(--forest-dark)", fontWeight: 600 }}>Uploaded</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
