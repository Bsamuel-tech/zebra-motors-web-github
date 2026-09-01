// ---------------------------------------------------------------------------
// WHAT IF: FLEET SCORING
// ---------------------------------------------------------------------------
// Deterministic, explainable scoring, in the same spirit as
// lib/recommend.js (Stage 1 of the AI/ML roadmap): every point awarded has a
// stated reason shown to the customer. This does not replace
// lib/recommend.js (still used by the slider-only Trip Planner), it is a
// twin built for What If's richer, natural-language-derived scenario shape.
//
// Classifies vehicles into three tiers so the reasoning is visible, per the
// platform's "transparent AI" requirement:
//   bestMatch:       highest-scoring vehicle that meets hard constraints
//   lowerCost:       the cheapest vehicle that still meets hard constraints
//   notRecommended:  vehicles that fail a hard constraint, with the reason
// ---------------------------------------------------------------------------

import { midRateRWF } from "@/data/vehicles";

function requiredSeats(scenario) {
  const adults = scenario.adults ?? 2; // default assumption, stated in the UI
  const children = scenario.children ?? 0;
  return adults + children;
}

// Vehicle luggage is a descriptive string ("3 large bags"), not a
// configured numeric capacity, see data/vehicles.js. Section 13 of the spec
// is explicit: do not invent an exact trunk capacity. This only extracts
// the leading number already present in that description, purely for a
// soft, informational comparison, never a hard pass/fail cutoff.
function describedLuggageCount(vehicle) {
  const m = (vehicle.luggage || "").match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

export function scoreVehicles(vehicles, scenario) {
  const needSeats = requiredSeats(scenario);

  const scored = vehicles.map((v) => {
    let score = 0;
    const reasons = [];
    let hardFail = null;

    if (v.seats >= needSeats) {
      score += 30;
      reasons.push(`${v.seats} seats, enough for ${needSeats} passenger${needSeats === 1 ? "" : "s"}`);
    } else {
      hardFail = "Insufficient passenger capacity for this scenario.";
    }

    if (scenario.luggageCount != null) {
      const described = describedLuggageCount(v);
      if (described != null) {
        if (described >= scenario.luggageCount) {
          score += 8;
          reasons.push(`Described luggage space (${v.luggage}) covers ${scenario.luggageCount} pieces`);
        } else {
          score -= 5;
          reasons.push(`Described luggage space (${v.luggage}) may be tight for ${scenario.luggageCount} pieces, exact trunk capacity is not configured`);
        }
      }
    }

    if (scenario.tripType === "roadtrip") {
      if (v.tags?.includes("roadtrip") || v.tags?.includes("safari")) {
        score += 20;
        reasons.push("Suited to road trips and park terrain");
      }
      if (v.drive?.includes("4WD")) {
        score += 12;
        reasons.push("4WD available for unpaved park roads");
      }
    } else {
      if (v.tags?.includes("city") || v.tags?.includes("value")) {
        score += 12;
        reasons.push("Practical, efficient choice for city driving");
      }
    }

    if (scenario.budgetPreference === "budget") {
      const rate = midRateRWF(v);
      score += Math.max(0, 20 - rate / 3000);
    } else if (scenario.budgetPreference === "comfort") {
      if (v.category === "SUV") {
        score += 15;
        reasons.push("SUV format, the most comfortable configured option");
      }
    }

    if (scenario.driveMode === "driver") {
      score += 5;
      reasons.push("Comfortable cabin for a chauffeured trip");
    }

    return { vehicle: v, score, reasons, hardFail };
  });

  const eligible = scored.filter((s) => !s.hardFail).sort((a, b) => b.score - a.score);
  const ineligible = scored.filter((s) => s.hardFail);

  const bestMatch = eligible[0] || null;
  const lowerCost =
    eligible.length > 1
      ? [...eligible].sort((a, b) => midRateRWF(a.vehicle) - midRateRWF(b.vehicle)).find((s) => s.vehicle.id !== bestMatch?.vehicle.id) || null
      : null;

  return {
    bestMatch,
    lowerCost,
    notRecommended: ineligible,
    needSeats,
  };
}
