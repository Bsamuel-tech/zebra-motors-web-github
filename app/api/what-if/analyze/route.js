// ---------------------------------------------------------------------------
// WHAT IF: ANALYZE
// ---------------------------------------------------------------------------
// This is the boundary the spec calls for: text goes in, the deterministic
// parser (lib/whatIf/parseScenario.js, not an LLM, see that file) extracts a
// structured scenario, then everything that actually matters, fleet data,
// scoring, pricing, availability, comes from real services and the real
// database. Nothing here invents a price, a vehicle, or an availability
// answer.
// ---------------------------------------------------------------------------
import { NextResponse } from "next/server";
import { getVehicles, getVehicleBySlug } from "@/lib/db/vehicles";
import { parseScenario } from "@/lib/whatIf/parseScenario";
import { scoreVehicles } from "@/lib/whatIf/scoreVehicles";
import { estimateRental, chauffeurPricing, airportPricing } from "@/lib/whatIf/pricing";
import { checkAvailability } from "@/lib/db/availability";
import { recordWhatIfSession } from "@/lib/db/whatIfSessions";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text : "";
  const overrides = body.overrides || {};

  const parsed = parseScenario(text);
  const scenario = { ...parsed.scenario, ...overrides };

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
  };

  const sessionId = await recordWhatIfSession({
    rawInput: text,
    scenario,
    recommendedVehicleId: bestMatch?.vehicle?.dbId || null,
  });

  return NextResponse.json({ ...response, sessionId });
}
