"use client";

import { useState } from "react";
import Photo from "@/components/Photo";
import { telLink } from "@/data/settings";

// settings is passed down from the server component at
// app/(site)/airport-car-rental/page.js (Phase 3B, database-backed).
export default function AirportBookingForm({ settings }) {
  const [flight, setFlight] = useState({ number: "", date: "", time: "" });
  const [saved, setSaved] = useState(false);

  return (
    <div>
      <div style={{ position: "relative", height: 260 }}>
        <Photo height="100%" />
        <div style={{ position: "absolute", inset: 0, background: "rgba(15,14,8,.5)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div className="wrap">
            <h1 style={{ color: "#fff", fontSize: 32, marginBottom: 8 }}>Kigali International Airport Car Rental</h1>
            <p style={{ color: "#edeae0", fontSize: 14.5, maxWidth: 520 }}>
              Share your flight details in advance and a Zebra representative meets you at
              arrivals.
            </p>
          </div>
        </div>
      </div>

      <div className="wrap" style={{ display: "flex", gap: 40, padding: "44px 32px", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 560px" }}>
          <h2 style={{ fontSize: 22, marginBottom: 20 }}>What happens when you land</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 40 }}>
            {[
              ["You land and collect luggage", "Your flight number and arrival time, shared at booking, help Zebra plan your pickup."],
              ["Meet your Zebra representative at arrivals", "They hold a sign with your name and are reachable by phone from the moment you land."],
              ["Vehicle handover & inspection", "A short joint inspection is recorded, photos, mileage, fuel level, before you drive off."],
              ["Drive off, or take the wheel with your driver", "Self-drive or continue with a professional driver from the airport onward."],
            ].map(([title, body], i) => (
              <div key={title} style={{ display: "flex", gap: 14 }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--forest-dark)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 3 }}>{title}</div>
                  <div className="muted" style={{ fontSize: 13.5 }}>{body}</div>
                </div>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 22, marginBottom: 16 }}>Frequently asked questions</h2>
          <FaqItem q="Can Zebra deliver to the airport at any time?" a="Contact Zebra Motors to confirm availability for night arrivals and any surcharges." />
          <FaqItem q="What happens if my flight is delayed?" a="Call Zebra directly as soon as you know so your pickup can be adjusted." />
          <FaqItem q="Can I return the vehicle at the airport?" a="Contact Zebra Motors to confirm airport return options." />
          <FaqItem q="What documents do I need at pickup?" a="Passport and a valid driving licence. Confirm with Zebra Motors whether an International Driving Permit is also needed for your nationality." last />
        </div>

        <div style={{ width: 360, flexShrink: 0 }}>
          <div className="card" style={{ padding: 22, marginBottom: 18 }}>
            <h3 style={{ fontSize: 17, marginBottom: 4 }}>Add your flight details</h3>
            <p className="muted" style={{ fontSize: 12.5, marginBottom: 18 }}>
So Zebra knows when to meet you.
            </p>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Flight number</label>
              <input value={flight.number} onChange={(e) => setFlight({ ...flight, number: e.target.value })} placeholder="RW 205" />
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Arrival date</label>
              <input value={flight.date} onChange={(e) => setFlight({ ...flight, date: e.target.value })} placeholder="14 Sep 2026" />
            </div>
            <div className="field" style={{ marginBottom: 18 }}>
              <label>Arrival time</label>
              <input value={flight.time} onChange={(e) => setFlight({ ...flight, time: e.target.value })} placeholder="14:30" />
            </div>
            <button className="btn-primary" style={{ width: "100%" }} onClick={() => setSaved(true)}>
              Save flight details
            </button>
            {saved && (
              <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--forest-dark)" }}>
                Saved. Flight {flight.number || "(not provided)"} noted. A Zebra representative
                will use this to plan your pickup. If your flight is delayed, please call Zebra
                directly.
              </div>
            )}
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>Airport representative</div>
            <a href={telLink(settings)} style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
              {settings.phoneDisplay}
            </a>
            <div className="muted" style={{ fontSize: 13 }}>Available by phone</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FaqItem({ q, a, last }) {
  return (
    <div style={{ borderBottom: last ? "none" : "1px solid var(--line)", padding: "16px 0" }}>
      <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 4 }}>{q}</div>
      <div className="muted" style={{ fontSize: 13.5 }}>{a}</div>
    </div>
  );
}
