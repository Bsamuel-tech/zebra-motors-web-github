"use client";

import { useState } from "react";
import Link from "next/link";
import Photo from "@/components/Photo";
import { formatRWF, midRateRWF } from "@/data/vehicles";
import { recommendVehicles } from "@/lib/recommend";

const DESTINATIONS = ["Kigali", "Akagera", "Lake Kivu", "Volcanoes NP", "Nyungwe"];

// Receives the real fleet as a prop from the server component at
// app/(site)/plan-your-trip/page.js (Phase 3B, database-backed). This
// component stays client-side for its interactive form state, so it cannot
// query the database itself.
export default function TripPlanner({ vehicles }) {
  const [destinations, setDestinations] = useState(["Kigali", "Akagera", "Lake Kivu"]);
  const [days, setDays] = useState(8);
  const [travellers, setTravellers] = useState("couple");
  const [driveMode, setDriveMode] = useState("self");
  const [tripType, setTripType] = useState("roadtrip");
  const [budget, setBudget] = useState(35000);
  const [generated, setGenerated] = useState(false);

  function toggleDestination(d) {
    setDestinations((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  const recommendations = recommendVehicles(vehicles, { travellers, tripType, budget, driveMode });
  const top = recommendations[0];

  return (
    <div>
      <div style={{ background: "var(--ink)", padding: "40px 32px" }}>
        <div className="wrap">
          <p className="eyebrow" style={{ color: "#b9e0c8" }}>
            Zebra Travel Assistant
          </p>
          <h1 style={{ fontSize: 28, color: "#fff", marginBottom: 8 }}>Plan my Rwanda trip</h1>
          <p style={{ fontSize: 14, color: "#c9c6b6", maxWidth: 620 }}>
            Tell us the shape of your trip. We&apos;ll suggest a route and a suitable vehicle from
            Zebra&apos;s own fleet, using a transparent scoring system, not a confirmed
            reservation or park permit.
          </p>
        </div>
      </div>

      <div className="wrap" style={{ display: "flex", gap: 32, padding: "36px 32px 70px 32px", flexWrap: "wrap" }}>
        {/* input */}
        <div style={{ width: 360, flexShrink: 0 }} className="card">
          <div style={{ padding: 22 }}>
            <FieldLabel>Where are you going?</FieldLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              {DESTINATIONS.map((d) => (
                <button key={d} className={`chip ${destinations.includes(d) ? "on" : ""}`} onClick={() => toggleDestination(d)}>
                  {d}
                </button>
              ))}
            </div>

            <FieldLabel>How many days?</FieldLabel>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <RoundBtn onClick={() => setDays((d) => Math.max(1, d - 1))}>−</RoundBtn>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{days} days</span>
              <RoundBtn onClick={() => setDays((d) => d + 1)}>+</RoundBtn>
            </div>

            <FieldLabel>Travellers</FieldLabel>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {["solo", "couple", "family", "group"].map((t) => (
                <button key={t} className={`chip ${travellers === t ? "on" : ""}`} onClick={() => setTravellers(t)} style={{ textTransform: "capitalize" }}>
                  {t}
                </button>
              ))}
            </div>

            <FieldLabel>Self-drive or driver?</FieldLabel>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              <button className={`chip ${driveMode === "self" ? "on" : ""}`} onClick={() => setDriveMode("self")}>
                Self-drive
              </button>
              <button className={`chip ${driveMode === "driver" ? "on" : ""}`} onClick={() => setDriveMode("driver")}>
                Professional driver
              </button>
            </div>

            <FieldLabel>Trip style</FieldLabel>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {["city", "roadtrip", "safari", "mixed"].map((t) => (
                <button key={t} className={`chip ${tripType === t ? "on" : ""}`} onClick={() => setTripType(t)} style={{ textTransform: "capitalize" }}>
                  {t}
                </button>
              ))}
            </div>

            <FieldLabel>Budget per day (RWF)</FieldLabel>
            <input type="range" min="20000" max="55000" step="1000" value={budget} onChange={(e) => setBudget(Number(e.target.value))} style={{ width: "100%", marginBottom: 6 }} />
            <div className="muted" style={{ fontSize: 12.5, marginBottom: 22 }}>
              ~RWF {formatRWF(budget)}/day
            </div>

            <button className="btn-primary" style={{ width: "100%" }} onClick={() => setGenerated(true)}>
              Generate my itinerary
            </button>
          </div>
        </div>

        {/* results */}
        <div style={{ flex: 1, minWidth: 320 }}>
          {!generated ? (
            <div className="card" style={{ padding: 40, textAlign: "center" }}>
              <p className="muted">Fill in your trip on the left and generate a suggested itinerary.</p>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 8 }}>
                <h2 style={{ fontSize: 22 }}>Suggested {days}-day itinerary</h2>
                <span className="muted" style={{ fontSize: 12.5 }}>
                  Suggestion, not a confirmed booking or park permit
                </span>
              </div>

              <div className="card" style={{ padding: "22px 26px", marginBottom: 22 }}>
                {destinations.map((d, i) => (
                  <div key={d} style={{ display: "flex", gap: 16, padding: "16px 0", borderBottom: i < destinations.length - 1 ? "1px solid var(--line)" : "none" }}>
                    <div style={{ width: 46, flexShrink: 0, fontSize: 12, fontWeight: 600, color: "var(--forest-dark)" }}>
                      STOP {i + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 3 }}>{d}</div>
                      <div className="muted" style={{ fontSize: 13.5 }}>
                        {destinationNote(d)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {top && (
                <div className="card" style={{ padding: 20, display: "flex", gap: 18, alignItems: "center", marginBottom: 18, flexWrap: "wrap" }}>
                  <Photo height={80} style={{ width: 110, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--forest-dark)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 4 }}>
                      Recommended vehicle
                    </div>
                    <div style={{ fontSize: 17, marginBottom: 4 }}>
                      {top.vehicle.name}, {top.vehicle.category}, {top.vehicle.drive}
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "var(--ink-soft)" }}>
                      {top.reasons.slice(0, 3).map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                      ≈ RWF {formatRWF(midRateRWF(top.vehicle) * days)} for {days} days
                    </div>
                    <Link href={`/book?vehicle=${top.vehicle.id}`} className="chip on">
                      Book this itinerary →
                    </Link>
                  </div>
                </div>
              )}

              <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
                This itinerary is a suggestion generated from a transparent scoring of route,
                terrain, group size and budget, not a certified tour package, and not a substitute
                for checking current park regulations, gorilla trekking permit availability, or
                road conditions directly.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function destinationNote(d) {
  const notes = {
    Kigali: "City orientation, memorial, markets. Roads paved and easy for self-drive.",
    Akagera: "≈2.5-3 hr from Kigali. Game drives, some unpaved park roads, 4WD recommended.",
    "Lake Kivu": "Scenic lakeside roads via Musanze or Karongi, relaxed pace.",
    "Volcanoes NP": "≈2-3 hr from Kigali. Early starts for gorilla trekking, permits booked separately.",
    Nyungwe: "≈5-6 hr from Kigali via Huye. Canopy walk and forest trekking.",
  };
  return notes[d] || "";
}

function FieldLabel({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 10 }}>{children}</div>;
}

function RoundBtn({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="card"
      style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, cursor: "pointer" }}
    >
      {children}
    </button>
  );
}
