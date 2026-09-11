"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Photo from "@/components/Photo";
import { formatRWF } from "@/data/vehicles";

const EXAMPLES = [
  "What if I travel with 4 people for 8 days?",
  "What if my wife and two children come with me for 9 days to Kigali and Akagera?",
  "What if I need a driver?",
  "What if I arrive at Kigali Airport?",
  "What if I choose the Sorento instead of the Corolla?",
];

const QUICK_ACTIONS = [
  { key: "affordable", label: "More affordable" },
  { key: "comfort", label: "More comfortable" },
  { key: "morePassengers", label: "More passengers" },
  { key: "longer", label: "Longer trip" },
  { key: "driver", label: "With driver" },
  { key: "airport", label: "Airport pickup" },
];

function applyQuickAction(key, current) {
  const next = { ...current };
  if (key === "affordable") next.budgetPreference = "budget";
  if (key === "comfort") next.budgetPreference = "comfort";
  if (key === "morePassengers") next.adults = (current.adults || 2) + 2;
  if (key === "longer") next.days = (current.days || 3) + 3;
  if (key === "driver") next.driveMode = "driver";
  if (key === "airport") next.mentionsAirport = true;
  return next;
}

export default function WhatIfExplorer({ initialText = "" }) {
  const router = useRouter();
  const [text, setText] = useState(initialText);
  const [result, setResult] = useState(null);
  const [overrides, setOverrides] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [savedName, setSavedName] = useState("");
  const [saved, setSaved] = useState(false);

  async function analyze(nextOverrides = overrides, nextText = text, previousScenario = null) {
    if (!nextText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/what-if/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: nextText, overrides: nextOverrides, previousScenario }),
      });
      if (!res.ok) throw new Error("Could not analyze this scenario.");
      const data = await res.json();
      setResult(data);
      setOverrides(nextOverrides);
    } catch (e) {
      setError("Something went wrong reading that scenario. Try rephrasing it, or use the quick controls below.");
    } finally {
      setLoading(false);
    }
  }

  function handleQuickAction(key) {
    const base = result?.scenario || overrides;
    const next = applyQuickAction(key, base);
    analyze(next);
  }

  function handleSave() {
    if (!result) return;
    try {
      const list = JSON.parse(localStorage.getItem("zebra-what-if-scenarios") || "[]");
      list.unshift({
        name: savedName || `Scenario, ${new Date().toLocaleDateString()}`,
        text,
        overrides,
        savedAt: new Date().toISOString(),
      });
      localStorage.setItem("zebra-what-if-scenarios", JSON.stringify(list.slice(0, 20)));
      setSaved(true);
    } catch (e) {
      // localStorage can fail (private browsing, quota); not critical.
    }
  }

  async function handleContinue(vehicleSlug) {
    if (result?.sessionId) {
      fetch("/api/what-if/continue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: result.sessionId }),
      }).catch(() => {});
    }
    const params = new URLSearchParams({ vehicle: vehicleSlug });
    if (result?.scenario?.pickupDate) params.set("pickup", result.scenario.pickupDate);
    if (result?.scenario?.returnDate) params.set("return", result.scenario.returnDate);
    router.push(`/book?${params.toString()}`);
  }

  return (
    <div>
      <div style={{ background: "var(--ink)", padding: "44px 32px" }}>
        <div className="wrap">
          <p className="eyebrow" style={{ color: "#b9e0c8" }}>
            Zebra AI What If
          </p>
          <h1 style={{ fontSize: 30, color: "#fff", marginBottom: 8 }}>What if...?</h1>
          <p style={{ fontSize: 14.5, color: "#c9c6b6", maxWidth: 640, marginBottom: 4 }}>
            Explore different ways to plan your Rwanda trip.
          </p>
          <p style={{ fontSize: 12, color: "#8f8c78", maxWidth: 640 }}>
            This reads your description with rule-based text matching, not a connected AI
            assistant, and checks the result against Zebra&apos;s real fleet, pricing, and
            availability. It will not always understand unusual phrasing, the quick controls
            below let you correct or refine it.
          </p>
        </div>
      </div>

      <div className="wrap" style={{ padding: "36px 32px 70px 32px" }}>
        <div className="card" style={{ padding: 22, marginBottom: 24 }}>
          <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)", display: "block", marginBottom: 10 }}>
            Describe your scenario
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="What if I travel with 4 people for 8 days and visit Akagera?"
            style={{ width: "100%", border: "1px solid var(--line)", padding: 12, fontFamily: "inherit", fontSize: 14.5, marginBottom: 12 }}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" className="chip" onClick={() => setText(ex)}>
                {ex}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button
              className="btn-primary"
              onClick={() => analyze({}, text, result?.scenario || null)}
              disabled={loading || !text.trim()}
            >
              {loading ? "Analyzing..." : result ? "Continue this scenario" : "Explore this scenario"}
            </button>
            {result && (
              <button
                type="button"
                className="btn-outline"
                onClick={() => {
                  setResult(null);
                  setOverrides({});
                }}
                disabled={loading}
              >
                Start a new scenario
              </button>
            )}
          </div>
          {result && (
            <p className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>
              Typing a follow-up (like "what if I add Lake Kivu?") builds on the scenario above.
              Use "Start a new scenario" to describe an unrelated trip instead.
            </p>
          )}
          {error && (
            <p style={{ color: "#a33", fontSize: 13, marginTop: 10 }}>{error}</p>
          )}
        </div>

        {result && <WhatIfResult result={result} onQuickAction={handleQuickAction} onContinue={handleContinue} />}

        {result && !result.isPolicyQuestion && (
          <div className="card" style={{ padding: 20, marginTop: 24 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <input
                value={savedName}
                onChange={(e) => setSavedName(e.target.value)}
                placeholder="Name this scenario, e.g. My Rwanda Family Trip"
                style={{ flex: 1, minWidth: 220, border: "1px solid var(--line)", padding: 10, fontSize: 13.5 }}
              />
              <button className="btn-outline" onClick={handleSave}>
                Save this scenario
              </button>
              {saved && <span style={{ fontSize: 12.5, color: "var(--forest-dark)" }}>Saved on this device.</span>}
            </div>
            <p className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>
              Saved to this browser only, there is no Zebra account system yet. Clearing your
              browser data will remove it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function WhatIfResult({ result, onQuickAction, onContinue }) {
  const { scenario, bestMatch, lowerCost, notRecommended, missingInformation, availability, chauffeur, airport, comparisonVehicle, isPolicyQuestion, route } = result;

  if (isPolicyQuestion) {
    return (
      <div className="card" style={{ padding: 22 }}>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, marginBottom: 14 }}>
          This reads like a question about Zebra Motors&apos; policies rather than a trip
          scenario. What If compares vehicles for a described trip, it does not have Zebra&apos;s
          policy answers built in.
        </p>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, marginBottom: 16 }}>
          Check the <Link href="/faq" style={{ fontWeight: 600 }}>FAQ page</Link> or{" "}
          <Link href="/contact" style={{ fontWeight: 600 }}>contact Zebra Motors directly</Link>{" "}
          for a real answer.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <span className="muted" style={{ fontSize: 12, alignSelf: "center" }}>Or describe a trip instead:</span>
          {["What if I travel with 4 people for 8 days?"].map((ex) => (
            <span key={ex} className="chip">{ex}</span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--forest-dark)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 10 }}>
          Your scenario
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <ScenarioChip label={scenario.adults != null ? `${scenario.adults} adult${scenario.adults === 1 ? "" : "s"}` : "Adults not specified"} />
          {scenario.children > 0 && <ScenarioChip label={`${scenario.children} children`} />}
          <ScenarioChip label={scenario.days ? `${scenario.days} days` : "Trip length not specified"} />
          {scenario.destinations?.length > 0 && <ScenarioChip label={scenario.destinations.join(" + ")} />}
          <ScenarioChip label={scenario.driveMode === "driver" ? "With driver" : "Self-drive"} />
          {scenario.mentionsAirport && <ScenarioChip label="Airport pickup" />}
          {scenario.luggageCount != null && <ScenarioChip label={`${scenario.luggageCount} luggage pieces`} />}
        </div>
        {missingInformation?.length > 0 && (
          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            Assumed defaults for: {missingInformation.join(", ")}. Use the quick actions below to correct these.
          </p>
        )}
      </div>

      {bestMatch ? (
        <div className="card" style={{ padding: 22, marginBottom: 16, border: "1px solid var(--forest-dark)" }}>
          <div className="badge badge-forest" style={{ marginBottom: 12 }}>Best match</div>
          <VehicleResultRow entry={bestMatch} onContinue={onContinue} primary />
        </div>
      ) : (
        <div className="card" style={{ padding: 22, marginBottom: 16 }}>
          <p style={{ fontSize: 14 }}>None of Zebra&apos;s four current vehicles fit this exact scenario, most likely passenger capacity. Try adjusting passengers below, or contact Zebra Motors directly.</p>
        </div>
      )}

      {lowerCost && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div className="badge" style={{ marginBottom: 10 }}>Lower-cost option</div>
          <VehicleResultRow entry={lowerCost} onContinue={onContinue} />
        </div>
      )}

      {comparisonVehicle && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div className="badge" style={{ marginBottom: 10 }}>You asked about</div>
          <VehicleResultRow entry={comparisonVehicle} onContinue={onContinue} />
        </div>
      )}

      {notRecommended?.length > 0 && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 10 }}>
            Not recommended for this scenario
          </div>
          {notRecommended.map((e) => (
            <div key={e.vehicle.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              <span>{e.vehicle.name}</span>
              <span className="muted">{e.reason}</span>
            </div>
          ))}
        </div>
      )}

      {availability && (
        <div className="card" style={{ padding: 18, marginBottom: 16, background: availability.available === false ? "#fdf2f2" : undefined }}>
          <strong style={{ fontSize: 13.5 }}>{availability.reason}</strong>
        </div>
      )}

      {route && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 10 }}>
            Route for {route.stops?.join(" → ") || scenario.destinations.join(" → ")}
          </div>
          {route.distanceKm != null ? (
            <>
              <p style={{ fontSize: 14.5, marginBottom: 6 }}>
                Real routed distance: {Math.round(route.distanceKm)} km, about {Math.round(route.durationMinutes / 60)}h {Math.round(route.durationMinutes % 60)}m driving time.
              </p>
              {route.mileageImpact && (
                <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>
                  {route.mileageImpact.policy === "UNLIMITED"
                    ? route.mileageImpact.note
                    : `Projected ${route.mileageImpact.projectedKm} km against a ${route.mileageImpact.allowanceKm} km allowance: ${route.mileageImpact.overageKm > 0 ? `about RWF ${route.mileageImpact.overageChargeRWF.toLocaleString("en-US")} in projected extra mileage charges.` : "within the included allowance."}`}
                </p>
              )}
            </>
          ) : (
            <p style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>{route.note}</p>
          )}
          {route.missingCoordinates?.length > 0 && (
            <p className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>
              No coordinates on file yet for: {route.missingCoordinates.join(", ")}, so this route excludes {route.missingCoordinates.length === 1 ? "it" : "them"}.
            </p>
          )}
        </div>
      )}

      {chauffeur && !chauffeur.configured && (
        <div className="card confirm-note" style={{ display: "block", padding: 16, marginBottom: 16 }}>
          {chauffeur.message}
        </div>
      )}
      {airport && !airport.configured && (
        <div className="card confirm-note" style={{ display: "block", padding: 16, marginBottom: 16 }}>
          {airport.message}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        <span className="muted" style={{ fontSize: 12, alignSelf: "center" }}>Try another scenario:</span>
        {QUICK_ACTIONS.map((a) => (
          <button key={a.key} className="chip" onClick={() => onQuickAction(a.key)}>
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function VehicleResultRow({ entry, onContinue, primary }) {
  const { vehicle, reasons, estimate } = entry;
  return (
    <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
      <Photo height={80} style={{ width: 110, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ fontSize: 18, marginBottom: 4 }}>{vehicle.name}</div>
        <div className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>
          {vehicle.category} · {vehicle.seats} seats · {vehicle.transmission}
        </div>
        {reasons?.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "var(--ink-soft)" }}>
            {reasons.slice(0, 3).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
      </div>
      <div style={{ textAlign: "right" }}>
        {estimate && (
          <div className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>
            ≈ {estimate.minLabel} to {estimate.maxLabel}
            <br />
            <span style={{ fontSize: 10.5 }}>{estimate.note}</span>
          </div>
        )}
        <button className={primary ? "btn-primary" : "btn-outline"} onClick={() => onContinue(vehicle.id)}>
          Continue with this option
        </button>
      </div>
    </div>
  );
}

function ScenarioChip({ label }) {
  return (
    <span style={{ fontSize: 12.5, padding: "6px 12px", background: "var(--paper-alt)", borderRadius: 20 }}>
      {label}
    </span>
  );
}
