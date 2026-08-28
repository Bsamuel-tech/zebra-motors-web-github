"use client";

import { useMemo, useState } from "react";
import { runBusinessScenario } from "@/lib/whatIf/businessSimulation";

const LABEL_COLORS = {
  ASSUMPTION: "#8a6d1f",
  ESTIMATE: "#2F5D46",
  PROJECTION: "#6b4a9c",
};

function LabelBadge({ type }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: ".05em",
        textTransform: "uppercase",
        color: "#fff",
        background: LABEL_COLORS[type] || "#666",
        padding: "2px 8px",
        borderRadius: 3,
        marginRight: 8,
        flexShrink: 0,
      }}
    >
      {type}
    </span>
  );
}

export default function AdminWhatIfSimulator({ baseline }) {
  const [priceAdjustPct, setPriceAdjustPct] = useState(0);
  const [fleetSizeChange, setFleetSizeChange] = useState(0);
  const [assumedMonthlyBookings, setAssumedMonthlyBookings] = useState(10);
  const [assumedAvgRentalDays, setAssumedAvgRentalDays] = useState(5);

  const result = useMemo(
    () =>
      runBusinessScenario(baseline, {
        priceAdjustPct,
        fleetSizeChange,
        assumedMonthlyBookings,
        assumedAvgRentalDays,
      }),
    [baseline, priceAdjustPct, fleetSizeChange, assumedMonthlyBookings, assumedAvgRentalDays]
  );

  return (
    <div>
      {!baseline.hasSufficientHistory && (
        <div className="card confirm-note" style={{ display: "block", padding: 16, marginBottom: 20, maxWidth: 680 }}>
          Historical data is currently insufficient for a reliable forecast. Zebra Motors has{" "}
          {baseline.realBookingsCount} recorded real booking{baseline.realBookingsCount === 1 ? "" : "s"} so far.
          Every volume and revenue figure below comes from the assumptions you set, not from
          measured demand.
        </div>
      )}

      <div className="card" style={{ padding: 20, marginBottom: 20, maxWidth: 680 }}>
        <h2 style={{ fontSize: 15, marginBottom: 4 }}>Real baseline (today)</h2>
        <p className="muted" style={{ fontSize: 12, marginBottom: 14 }}>
          Read directly from the current fleet and booking tables, not editable here.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          <div>
            <div className="muted" style={{ fontSize: 11 }}>Fleet size</div>
            <div style={{ fontSize: 20 }}>{baseline.fleetCount}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 11 }}>Average daily rate</div>
            <div style={{ fontSize: 20 }}>RWF {baseline.avgDailyRateRWF.toLocaleString("en-US")}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 11 }}>Real bookings on record</div>
            <div style={{ fontSize: 20 }}>{baseline.realBookingsCount}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 20, maxWidth: 680 }}>
        <h2 style={{ fontSize: 15, marginBottom: 14 }}>Scenario inputs (your assumptions)</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div className="field">
            <label>Price adjustment (%)</label>
            <input
              type="number"
              value={priceAdjustPct}
              onChange={(e) => setPriceAdjustPct(e.target.value === "" ? 0 : Number(e.target.value))}
              step={1}
            />
          </div>
          <div className="field">
            <label>Fleet size change (vehicles)</label>
            <input
              type="number"
              value={fleetSizeChange}
              onChange={(e) => setFleetSizeChange(e.target.value === "" ? 0 : Number(e.target.value))}
              step={1}
            />
          </div>
          <div className="field">
            <label>Assumed bookings per month</label>
            <input
              type="number"
              min={0}
              value={assumedMonthlyBookings}
              onChange={(e) => setAssumedMonthlyBookings(e.target.value === "" ? 0 : Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Assumed average rental length (days)</label>
            <input
              type="number"
              min={0}
              value={assumedAvgRentalDays}
              onChange={(e) => setAssumedAvgRentalDays(e.target.value === "" ? 0 : Number(e.target.value))}
            />
          </div>
        </div>
        <p className="muted" style={{ fontSize: 11.5, marginTop: 12 }}>
          Booking volume and rental length are not measured, Zebra does not yet have enough real
          booking history. Enter your own working assumptions to see how they play out.
        </p>
      </div>

      <div className="card" style={{ padding: 20, maxWidth: 680 }}>
        <h2 style={{ fontSize: 15, marginBottom: 14 }}>Scenario result</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
          <div>
            <div className="muted" style={{ fontSize: 11 }}>Scenario avg daily rate</div>
            <div style={{ fontSize: 18 }}>RWF {result.scenarioMetrics.estimates.scenarioAvgDailyRateRWF.toLocaleString("en-US")}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 11 }}>Scenario fleet size</div>
            <div style={{ fontSize: 18 }}>{result.scenarioMetrics.estimates.scenarioFleetCount}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 11 }}>Projected monthly revenue</div>
            <div style={{ fontSize: 18 }}>
              RWF {result.scenarioMetrics.projections.projectedMonthlyRevenueRWF.toLocaleString("en-US")}
            </div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 11 }}>Change vs. current price</div>
            <div style={{ fontSize: 18 }}>
              {result.comparison.revenueDeltaPct != null
                ? `${result.comparison.revenueDeltaPct >= 0 ? "+" : ""}${result.comparison.revenueDeltaPct}%`
                : "n/a"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {result.explanation.map((line, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", fontSize: 12.5, lineHeight: 1.6 }}>
              <LabelBadge type={line.type} />
              <span style={{ color: "var(--ink-soft)" }}>{line.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
