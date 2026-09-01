"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Photo from "@/components/Photo";
import { formatRWF, midRateRWF } from "@/data/vehicles";
import { recommendVehicles } from "@/lib/recommend";

let stopCounter = 0;
function newStopId() {
  stopCounter += 1;
  return `stop-${Date.now()}-${stopCounter}`;
}

function stopFromDestination(destination) {
  return {
    id: newStopId(),
    destinationId: destination.dbId,
    name: destination.name,
    region: destination.region,
    category: destination.category,
    description: destination.description,
    recommendedVehicleCategory: destination.recommendedVehicleCategory,
    isCustom: false,
    arrival: "",
    departure: "",
    durationDays: 1,
    notes: "",
  };
}

function stopFromCustomName(name) {
  return {
    id: newStopId(),
    destinationId: null,
    name,
    region: "",
    category: "CUSTOM",
    description: "",
    recommendedVehicleCategory: null,
    isCustom: true,
    arrival: "",
    departure: "",
    durationDays: 1,
    notes: "",
  };
}

// Receives the real fleet and the real published destinations catalogue as
// props from the server component at app/(site)/plan-your-trip/page.js.
// Destination search here is unrestricted, it filters the full real
// catalogue rather than offering a fixed short list of buttons, and a
// customer can also add a place that is not in the catalogue at all, which
// gets logged as a real demand signal (see /api/destinations/custom)
// without ever publishing it to the public site on its own.
export default function TripPlanner({ vehicles, destinations }) {
  const [query, setQuery] = useState("");
  const [customName, setCustomName] = useState("");
  const [stops, setStops] = useState(() =>
    destinations.slice(0, 3).map((d) => stopFromDestination(d))
  );
  const [travellers, setTravellers] = useState("couple");
  const [driveMode, setDriveMode] = useState("self");
  const [tripType, setTripType] = useState("roadtrip");
  const [budget, setBudget] = useState(35000);
  const [generated, setGenerated] = useState(false);

  const totalDays = stops.reduce((sum, s) => sum + (Number(s.durationDays) || 0), 0) || 1;

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return destinations
      .filter((d) => !stops.some((s) => s.destinationId === d.dbId))
      .filter((d) => d.name.toLowerCase().includes(q) || (d.region || "").toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, destinations, stops]);

  function addDestination(destination) {
    setStops((prev) => [...prev, stopFromDestination(destination)]);
    setQuery("");
  }

  async function addCustom() {
    const name = customName.trim();
    if (!name) return;
    const match = destinations.find((d) => d.name.toLowerCase() === name.toLowerCase());
    if (match) {
      addDestination(match);
      setCustomName("");
      return;
    }
    setStops((prev) => [...prev, stopFromCustomName(name)]);
    setCustomName("");
    try {
      await fetch("/api/destinations/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, source: "trip_planner" }),
      });
    } catch {
      // A failed log call should never block the customer from planning
      // their trip, this is a background signal for Zebra, not a required
      // step.
    }
  }

  function removeStop(id) {
    setStops((prev) => prev.filter((s) => s.id !== id));
  }

  function moveStop(id, direction) {
    setStops((prev) => {
      const index = prev.findIndex((s) => s.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function updateStop(id, patch) {
    setStops((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  const recommendations = recommendVehicles(vehicles, { travellers, tripType, budget, driveMode });
  const top = recommendations[0];
  const suggestedVehicleCategories = [
    ...new Set(stops.map((s) => s.recommendedVehicleCategory).filter(Boolean)),
  ];

  return (
    <div>
      <div style={{ background: "var(--ink)", padding: "40px 32px" }}>
        <div className="wrap">
          <p className="eyebrow" style={{ color: "#b9e0c8" }}>
            Zebra Travel Assistant
          </p>
          <h1 style={{ fontSize: 28, color: "#fff", marginBottom: 8 }}>Plan my Rwanda trip</h1>
          <p style={{ fontSize: 14, color: "#c9c6b6", maxWidth: 620 }}>
            Search any destination, build a multi-stop route, and we&apos;ll suggest a vehicle
            from Zebra&apos;s own fleet using a transparent scoring system, not a confirmed
            reservation or park permit.
          </p>
        </div>
      </div>

      <div className="wrap" style={{ display: "flex", gap: 32, padding: "36px 32px 70px 32px", flexWrap: "wrap" }}>
        {/* input */}
        <div style={{ width: 380, flexShrink: 0 }} className="card">
          <div style={{ padding: 22 }}>
            <FieldLabel>Search destinations</FieldLabel>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type any place in Rwanda"
              style={{ border: "1px solid var(--line)", padding: "10px 12px", fontSize: 13.5, width: "100%", marginBottom: 6 }}
            />
            {searchResults.length > 0 && (
              <div className="card" style={{ marginBottom: 14, maxHeight: 180, overflowY: "auto" }}>
                {searchResults.map((d) => (
                  <button
                    key={d.dbId}
                    onClick={() => addDestination(d)}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", fontSize: 13, background: "none", border: "none", borderBottom: "1px solid var(--line)", cursor: "pointer" }}
                  >
                    <strong>{d.name}</strong>
                    {d.region ? <span className="muted"> · {d.region}</span> : null}
                  </button>
                ))}
              </div>
            )}
            <p className="muted" style={{ fontSize: 11.5, marginBottom: 16 }}>
              Search covers every published Zebra destination, not a fixed shortlist.
            </p>

            <FieldLabel>Not in the list?</FieldLabel>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Type a place name"
                style={{ flex: 1, border: "1px solid var(--line)", padding: "10px 12px", fontSize: 13.5 }}
              />
              <button type="button" className="btn-outline" style={{ padding: "8px 14px", fontSize: 13 }} onClick={addCustom}>
                Add
              </button>
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

            <button className="btn-primary" style={{ width: "100%" }} onClick={() => setGenerated(true)} disabled={stops.length === 0}>
              Generate my itinerary
            </button>
          </div>
        </div>

        {/* stops builder + results */}
        <div style={{ flex: 1, minWidth: 320 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ fontSize: 18 }}>Your route ({stops.length} stop{stops.length === 1 ? "" : "s"}, {totalDays} day{totalDays === 1 ? "" : "s"} total)</h2>
          </div>

          {stops.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: "center", marginBottom: 24 }}>
              <p className="muted">Search or add a destination on the left to start building your route.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              {stops.map((s, i) => (
                <StopCard
                  key={s.id}
                  stop={s}
                  index={i}
                  isFirst={i === 0}
                  isLast={i === stops.length - 1}
                  onRemove={() => removeStop(s.id)}
                  onMoveUp={() => moveStop(s.id, -1)}
                  onMoveDown={() => moveStop(s.id, 1)}
                  onChange={(patch) => updateStop(s.id, patch)}
                />
              ))}
            </div>
          )}

          {generated && stops.length > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 8 }}>
                <h2 style={{ fontSize: 22 }}>Suggested itinerary</h2>
                <span className="muted" style={{ fontSize: 12.5 }}>
                  Suggestion, not a confirmed booking or park permit
                </span>
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
                    {suggestedVehicleCategories.length > 0 && (
                      <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                        Some of your stops are usually visited with a {suggestedVehicleCategories.join(" or ")}, Zebra
                        can confirm what fits your exact route.
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                      Approximately RWF {formatRWF(midRateRWF(top.vehicle) * totalDays)} for {totalDays} days
                    </div>
                    <Link href={`/book?vehicle=${top.vehicle.id}`} className="chip on">
                      Book this itinerary
                    </Link>
                  </div>
                </div>
              )}

              <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
                This itinerary is a suggestion generated from a transparent scoring of route,
                terrain, group size and budget, not a certified tour package, and not a substitute
                for checking current park regulations, gorilla trekking permit availability, or
                road conditions directly. Real distance and drive time between stops are not
                calculated yet, that needs a mapping provider (a later phase).
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StopCard({ stop, index, isFirst, isLast, onRemove, onMoveUp, onMoveDown, onChange }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ width: 30, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--forest-dark)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600 }}>
            {index + 1}
          </div>
          <button onClick={onMoveUp} disabled={isFirst} style={{ background: "none", border: "none", cursor: isFirst ? "default" : "pointer", opacity: isFirst ? 0.3 : 1, fontSize: 13, padding: 0 }} title="Move up">
            ▲
          </button>
          <button onClick={onMoveDown} disabled={isLast} style={{ background: "none", border: "none", cursor: isLast ? "default" : "pointer", opacity: isLast ? 0.3 : 1, fontSize: 13, padding: 0 }} title="Move down">
            ▼
          </button>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
            <div>
              <span style={{ fontSize: 14.5, fontWeight: 600 }}>{stop.name}</span>
              {stop.isCustom && (
                <span className="badge badge-muted" style={{ marginLeft: 8, fontSize: 9.5 }}>
                  Not yet in Zebra&apos;s catalogue
                </span>
              )}
              {stop.region && <div className="muted" style={{ fontSize: 12 }}>{stop.region}</div>}
            </div>
            <button onClick={onRemove} style={{ background: "none", border: "none", color: "#a33", fontSize: 12, cursor: "pointer" }}>
              Remove
            </button>
          </div>

          {stop.description && (
            <p className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>{stop.description}</p>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 8 }}>
            <div className="field">
              <label style={{ fontSize: 11 }}>Arrival</label>
              <input type="date" value={stop.arrival} onChange={(e) => onChange({ arrival: e.target.value })} style={{ fontSize: 12.5, padding: "7px 9px" }} />
            </div>
            <div className="field">
              <label style={{ fontSize: 11 }}>Departure</label>
              <input type="date" value={stop.departure} onChange={(e) => onChange({ departure: e.target.value })} style={{ fontSize: 12.5, padding: "7px 9px" }} />
            </div>
            <div className="field">
              <label style={{ fontSize: 11 }}>Days here</label>
              <input
                type="number"
                min="1"
                value={stop.durationDays}
                onChange={(e) => onChange({ durationDays: Math.max(1, Number(e.target.value) || 1) })}
                style={{ fontSize: 12.5, padding: "7px 9px" }}
              />
            </div>
          </div>

          <input
            type="text"
            value={stop.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="Notes for this stop (optional)"
            style={{ width: "100%", border: "1px solid var(--line)", padding: "7px 9px", fontSize: 12.5 }}
          />
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 10 }}>{children}</div>;
}
