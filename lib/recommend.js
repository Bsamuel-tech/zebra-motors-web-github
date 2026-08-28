// ---------------------------------------------------------------------------
// TRANSPARENT VEHICLE RECOMMENDATION
// ---------------------------------------------------------------------------
// A plain, explainable scoring function, not machine learning. Every point
// awarded has a stated reason, shown to the customer, per the platform's own
// rule: do not pretend this is machine learning if it is not. This is Stage 1
// of the AI/ML roadmap (Phase 3, item S). It can be replaced or augmented by
// a trained model later without changing the page that calls it, as long as
// the replacement returns the same { vehicle, score, reasons } shape.
// ---------------------------------------------------------------------------

import { midRateRWF, formatRWF } from "@/data/vehicles";

const TRAVELLER_SEATS = { solo: 1, couple: 2, family: 4, group: 6 };

export function recommendVehicles(vehicles, criteria) {
  const requiredSeats = TRAVELLER_SEATS[criteria.travellers] || 2;

  const scored = vehicles.map((v) => {
    let score = 0;
    const reasons = [];

    if (v.seats >= requiredSeats) {
      score += 20;
      reasons.push(`Seats ${v.seats}, enough room for ${criteria.travellers} travel`);
    } else {
      score -= 30;
      reasons.push(`Only ${v.seats} seats, may be tight for ${criteria.travellers} travel`);
    }

    if (criteria.tripType === "safari" || criteria.tripType === "roadtrip") {
      if (v.tags.includes("safari") || v.tags.includes("roadtrip")) {
        score += 25;
        reasons.push("Suited to road-trip and safari terrain");
      }
      if (v.drive && v.drive.includes("4WD")) {
        score += 15;
        reasons.push("4WD available for unpaved sections");
      }
    } else if (criteria.tripType === "city") {
      if (v.tags.includes("city") || v.tags.includes("value")) {
        score += 20;
        reasons.push("Efficient, easy choice for city driving");
      }
    } else if (criteria.tripType === "mixed") {
      if (v.category === "SUV") {
        score += 12;
        reasons.push("SUV flexibility for a mixed city + road trip");
      }
    }

    if (criteria.budget) {
      const rate = midRateRWF(v);
      const diff = criteria.budget - rate;
      if (diff >= 0) {
        score += Math.max(0, 20 - diff / 2000);
        reasons.push(`Around RWF ${formatRWF(rate)}/day fits your ~RWF ${formatRWF(criteria.budget)}/day budget`);
      } else {
        score -= 20;
        reasons.push(`Around RWF ${formatRWF(rate)}/day is above your ~RWF ${formatRWF(criteria.budget)}/day budget`);
      }
    }

    if (criteria.driveMode === "driver") {
      score += 5;
      reasons.push("Comfortable cabin for a chauffeured trip");
    }

    return { vehicle: v, score, reasons };
  });

  return scored.sort((a, b) => b.score - a.score);
}
