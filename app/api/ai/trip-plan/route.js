// ---------------------------------------------------------------------------
// AI TRIP PLANNER: free text -> structured trip data.
// ---------------------------------------------------------------------------
// AI architecture spec, item 12: a customer writes a paragraph describing
// their trip, this returns structured data the real Trip Planner
// (components/TripPlanner.js) can act on directly, never a separate
// parallel planner.
//
// HONESTY NOTE: no AI provider is configured (lib/ai/provider.js), so this
// reuses the same deterministic parser What If already uses
// (lib/whatIf/parseScenario.js), built from Zebra's real, current
// destinations (no hardcoded list, see that file's buildDestinationAliases).
// It reliably extracts travellers, trip length, an airport mention, and any
// destination it has an alias for, the same real, tested capability behind
// What If, not a new, separately-tested implementation. It will still miss
// a destination Zebra has not published and phrasing far from its patterns,
// exactly the limitation the feature audit already reported for What If,
// disclosed here rather than hidden. The moment a real AI provider key is
// added, this is the one place that would call it instead.
// ---------------------------------------------------------------------------
import { NextResponse } from "next/server";
import { parseScenario, buildDestinationAliases } from "@/lib/whatIf/parseScenario";
import { getDestinations } from "@/lib/db/destinations";

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return NextResponse.json({ error: "text is required." }, { status: 400 });

  const destinationRows = await getDestinations({ publishedOnly: true });
  const aliases = buildDestinationAliases(destinationRows);
  const parsed = parseScenario(text, aliases);
  const s = parsed.scenario;

  const matchedDestinations = destinationRows.filter((d) => s.destinations.includes(d.name));
  const unmatchedMentions = s.destinations.filter((name) => !matchedDestinations.some((d) => d.name === name));

  return NextResponse.json({
    parserType: "deterministic",
    travelers: { adults: s.adults, children: s.children },
    days: s.days,
    driveMode: s.driveMode,
    pickupAirport: s.mentionsAirport,
    destinations: matchedDestinations.map((d) => ({ dbId: d.dbId, name: d.name, region: d.region, category: d.category, lat: d.lat, lng: d.lng })),
    unmatchedMentions,
    missingInformation: parsed.missingInformation,
    note:
      "Extracted with rule-based text matching against Zebra's real published destinations, not a connected AI model. Review and adjust the stops it added below.",
  });
}
