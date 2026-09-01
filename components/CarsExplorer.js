"use client";

import { useMemo, useState } from "react";
import VehicleCard from "@/components/VehicleCard";
import { midRateRWF, formatRWF } from "@/data/vehicles";

const TYPES = ["Sedan", "SUV"];
const TRANSMISSIONS = ["Automatic", "Manual"];
const FUELS = ["Petrol", "Diesel", "Hybrid"];
const TRIP_TAGS = [
  { key: "city", label: "City / Kigali" },
  { key: "roadtrip", label: "Road trip" },
  { key: "safari", label: "Safari / 4WD" },
  { key: "families", label: "Families" },
  { key: "value", label: "Best value" },
];

// Receives the real fleet as a prop from the server component at
// app/(site)/cars/page.js (Phase 3B, database-backed). This component stays
// client-side for the interactive filters, so it cannot query the database
// itself.
export default function CarsExplorer({ vehicles }) {
  const [maxPrice, setMaxPrice] = useState(55000);
  const [types, setTypes] = useState([]);
  const [transmissions, setTransmissions] = useState([]);
  const [fuels, setFuels] = useState([]);
  const [tags, setTags] = useState([]);
  const [sort, setSort] = useState("recommended");

  function toggle(list, setList, value) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  const filtered = useMemo(() => {
    let result = vehicles.filter((v) => {
      if (midRateRWF(v) > maxPrice) return false;
      if (types.length && !types.includes(v.category)) return false;
      if (transmissions.length && !transmissions.includes(v.transmission)) return false;
      if (fuels.length && !fuels.includes(v.fuel)) return false;
      if (tags.length && !tags.some((t) => v.tags.includes(t))) return false;
      return true;
    });
    if (sort === "price-asc") result = [...result].sort((a, b) => midRateRWF(a) - midRateRWF(b));
    if (sort === "price-desc") result = [...result].sort((a, b) => midRateRWF(b) - midRateRWF(a));
    return result;
  }, [vehicles, maxPrice, types, transmissions, fuels, tags, sort]);

  return (
    <div className="wrap" style={{ paddingTop: 30, paddingBottom: 80 }}>
      <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
        Home / Fleet
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
        <h1 style={{ fontSize: 30 }}>Our fleet</h1>
        <div className="muted" style={{ fontSize: 13.5 }}>
          Showing {filtered.length} of {vehicles.length} vehicles
        </div>
      </div>

      <div style={{ display: "flex", gap: 30, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* filters */}
        <div style={{ width: 250, flexShrink: 0 }} className="card">
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 10 }}>
              Max price per day (RWF)
            </div>
            <input
              type="range"
              min="20000"
              max="55000"
              step="1000"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              style={{ width: "100%", marginBottom: 6 }}
            />
            <div className="muted" style={{ fontSize: 12.5, marginBottom: 18 }}>
              Up to RWF {formatRWF(maxPrice)}/day
            </div>

            <FilterGroup title="Vehicle type" options={TYPES} active={types} onToggle={(v) => toggle(types, setTypes, v)} />
            <FilterGroup
              title="Transmission"
              options={TRANSMISSIONS}
              active={transmissions}
              onToggle={(v) => toggle(transmissions, setTransmissions, v)}
            />
            <FilterGroup title="Fuel" options={FUELS} active={fuels} onToggle={(v) => toggle(fuels, setFuels, v)} />

            <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", margin: "18px 0 10px 0" }}>
              Trip type
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {TRIP_TAGS.map((t) => (
                <label key={t.key} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13.5, color: "var(--ink-soft)", cursor: "pointer" }}>
                  <input type="checkbox" checked={tags.includes(t.key)} onChange={() => toggle(tags, setTags, t.key)} />
                  {t.label}
                </label>
              ))}
            </div>

            <button
              onClick={() => {
                setMaxPrice(55000);
                setTypes([]);
                setTransmissions([]);
                setFuels([]);
                setTags([]);
              }}
              style={{ marginTop: 20, background: "none", border: "none", padding: 0, fontSize: 13, fontWeight: 600, color: "var(--muted)", cursor: "pointer", borderTop: "1px solid var(--line)", paddingTop: 14, width: "100%", textAlign: "left" }}
            >
              Clear all filters
            </button>
          </div>
        </div>

        {/* results */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="card" style={{ padding: "9px 14px", fontSize: 13.5, border: "1px solid var(--line)" }}>
              <option value="recommended">Sort: Recommended</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: "center" }}>
              <p className="muted">No vehicles match those filters right now. Try widening your search.</p>
            </div>
          ) : (
            <div className="grid-3">
              {filtered.map((v) => (
                <VehicleCard key={v.id} vehicle={v} />
              ))}
            </div>
          )}
          <p className="muted" style={{ fontSize: 11.5, marginTop: 20 }}>
            Availability shown here is not yet live. Confirm a specific vehicle and date with
            Zebra Motors before travelling.
          </p>
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ title, options, active, onToggle }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 10 }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {options.map((o) => (
          <label key={o} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13.5, color: "var(--ink-soft)", cursor: "pointer" }}>
            <input type="checkbox" checked={active.includes(o)} onChange={() => onToggle(o)} />
            {o}
          </label>
        ))}
      </div>
    </div>
  );
}
