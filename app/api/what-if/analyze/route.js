// ---------------------------------------------------------------------------
// WHAT IF: ANALYZE
// ---------------------------------------------------------------------------
// This is the boundary the spec calls for: text goes in, the deterministic
// parser (lib/whatIf/parseScenario.js, not an LLM, see that file) extracts a
// structured scenario, then everything that actually matters, fleet data,
// scoring, pricing, availability, route, and mileage impact, comes from
// real services and the real database. Nothing here invents a price, a
// vehicle, a distance, or an availability answer.
//
// Two real bugs found during the feature audit are fixed here:
//   1. The destination list used to be a hardcoded five names (see
//      lib/whatIf/parseScenario.js), now built live from whatever Zebra has
//      actually published in the destinations table.
//   2. A free-text follow-up ("what if I add Lake Kivu?") used to discard
//      the prior scenario entirely. The client now sends the prior
//      scenario back as `previousScenario`, merged in via mergeScenarios()
//      before the fresh text's own detections are applied.
// Also new: when the scenario names two or more destinations with real
// coordinates, this calls the real routing provider for distance and
// travel time, and projects the mileage impact against the recommended
// vehicle's real mileage policy, neither of which What If computed before.
// ---------------------------------------------------------------------------
import { NextResponse } from "next/server";
import { getVehicles, getVehicleBySlug } from "@/lib/db/vehicles";
import { parseScenario, mergeScenarios, buildDestinationAliases } from "@/lib/whatIf/parseScenario";
import { scoreVehicles } from "@/lib/whatIf/scoreVehicles";
import { estimateRental, chauffeurPricing, airportPricing } from "@/lib/whatIf/pricing";
import { checkAvailability } from "@/lib/db/availability";
import { recordWhatIfSession } from "@/lib/db/whatIfSessions";
import { getDestinations } from "@/lib/db/destinations";
import { getRoute } from "@/lib/geo/provider";

// Real projection, not a fabricated number: compares the routed distance
// against the vehicle's actual configured mileage policy (Section 12 of
// the feature audit already verified this math against a real booking,
// this reuses the same fields, just applied to a projected trip instead of
// a completed one).
function estimateMileageImpact(vehicle, projectedKm, days) {
  if (!vehicle || !Number.isFinite(projectedKm)) return null;
  if (vehicle.mileagePolicyType === "UNLIMITED") {
    return { policy: "UNLIMITED", projectedKm: Math.round(projectedKm), overageKm: 0, overageChargeRWF: 0, note: "Unlimited mileage plan, no extra charge regardless of distance." };
  }
  const allowanceKm =
    vehicle.mileagePolicyType === "DAILY_ALLOWANCE"
      ? (vehicle.includedKmPerDay || 0) * Math.max(1, days)
      : vehicle.includedTotalKm || 0;
  const overageKm = Math.max(0, Math.round(projectedKm - allowanceKm));
  const rate = vehicle.extraKmRateRWF || 0;
  return {
    policy: vehicle.mileagePolicyType,
    allowanceKm,
    projectedKm: Math.round(projectedKm),
    overageKm,
    overageChargeRWF: overageKm * rate,
    note: overageKm > 0 ? "Projected route distance would exceed the included mileage allowance." : "Within the included mileage allowance.",
  };
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text : "";
  const overrides = body.overrides || {};

  const destinationRows = await getDestinations({ publishedOnly: true });
  const aliases = buildDestinationAliases(destinationRows);
  const parsed = parseScenario(text, aliases);
  const merged = mergeScenarios(body.previousScenario || null, parsed.scenario);
  const scenario = { ...merged, ...overrides };

  // A policy question ("what if I need to cancel", "what if your insurance
  // doesn't cover me") is not a trip scenario. Do not force a vehicle
  // recommendation onto it, that would look like an answer to a question
  // this feature cannot actually answer. Point to the real source instead.
  if (parsed.isPolicyQuestion) {
    const sessionId = await recordWhatIfSession({ rawInput: text, scenario, recommendedVehicleId: null });
    return NextResponse.json({
      isPolicyQuestion: true,
      scenario,
      missingInformation: parsed.missingInformation,
      parserType: parsed.parserType,
      bestMatch: null,
      lowerCost: null,
      notRecommended: [],
      needSeats: null,
      availability: null,
      chauffeur: null,
      airport: null,
      comparisonVehicle: null,
      route: null,
      sessionId,
    });
  }

  const vehicles = await getVehicles();
  const result = scoreVehicles(vehicles, scenario);

  const days = scenario.days || 1;

  const withPricing = (entry) =>
    entry
      ? {
          vehicle: entry.vehicle,
          score: entry.score,
          reasons: entry.reasons,
          estimate: estimateRental(entry.vehicle, days),
        }
      : null;

  const bestMatch = withPricing(result.bestMatch);
  const lowerCost = withPricing(result.lowerCost);
  const notRecommended = result.notRecommended.map((e) => ({
    vehicle: e.vehicle,
    reason: e.hardFail,
  }));

  let availability = null;
  if (bestMatch && scenario.pickupDate && scenario.returnDate) {
    // vehicle_availability/bookings reference the vehicle's internal DB id
    // (vehicle.dbId), not its public slug (vehicle.id), see lib/db/vehicles.js.
    availability = await checkAvailability(bestMatch.vehicle.dbId, scenario.pickupDate, scenario.returnDate);
  }

  let comparisonVehicle = null;
  if (scenario.mentionedVehicle) {
    const v = vehicles.find((veh) => veh.id === scenario.mentionedVehicle);
    if (v) comparisonVehicle = withPricing({ vehicle: v, score: 0, reasons: [] });
  }

  // Real route, distance, travel time, and mileage impact, only when at
  // least two named destinations actually have real coordinates on file.
  // If they do not (a real, separate gap the feature audit also found,
  // several seeded destinations have no lat/lng yet), this says so plainly
  // rather than guessing a distance.
  let route = null;
  if (scenario.destinations?.length >= 2) {
    const points = [];
    const missingCoordinates = [];
    for (const name of scenario.destinations) {
      const match = destinationRows.find((d) => d.name === name);
      if (match?.lat != null && match?.lng != null) {
        points.push({ lat: match.lat, lng: match.lng, name });
      } else {
        missingCoordinates.push(name);
      }
    }
    if (points.length >= 2) {
      const routed = await getRoute(points.map((p) => ({ lat: p.lat, lng: p.lng })));
      if (routed) {
        const mileageImpact = bestMatch ? estimateMileageImpact(bestMatch.vehicle, routed.distanceKm, days) : null;
        route = { ...routed, stops: points.map((p) => p.name), missingCoordinates, mileageImpact };
      } else {
        route = { distanceKm: null, durationMinutes: null, stops: points.map((p) => p.name), missingCoordinates, note: "Routing provider could not calculate this route right now." };
      }
    } else {
      route = { distanceKm: null, durationMinutes: null, stops: [], missingCoordinates, note: "Not enough of these destinations have coordinates on file yet to calculate a real route." };
    }
  }

  const response = {
    scenario,
    missingInformation: parsed.missingInformation,
    parserType: parsed.parserType,
    bestMatch,
    lowerCost,
    notRecommended,
    needSeats: result.needSeats,
    availability,
    chauffeur: scenario.driveMode === "driver" ? chauffeurPricing() : null,
    airport: scenario.mentionsAirport ? airportPricing() : null,
    comparisonVehicle,
    route,
  };

  const sessionId = await recordWhatIfSession({
    rawInput: text,
    scenario,
    recommendedVehicleId: bestMatch?.vehicle?.dbId || null,
  });

  return NextResponse.json({ ...response, sessionId });
}
