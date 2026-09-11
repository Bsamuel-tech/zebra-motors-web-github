# Zebra AI Architecture: Implementation Report

Date: September 10, 2026
Scope: build the real AI architecture specified for Zebra Motors (Zebra AI Support, a shared tool-calling gateway, a knowledge base, human escalation with an admin console, and AI integration into the Trip Planner and What If), extending the existing codebase rather than duplicating it, with no AI provider connected yet. Every claim below was verified against a live running build on this machine, not assumed from reading code.

## What already existed before this pass

Confirmed via the prior FINAL_FEATURE_AUDIT.md and re-verified here: real customer authentication, a real booking flow that writes to the database, a real destinations database with admin-managed CRUD, a real Trip Planner with unrestricted destination search and live geocoding/routing (subject to this sandbox's own network limits), and a deterministic What If explorer (`lib/whatIf/*`) that recalculates vehicle and price from real fleet data but had two confirmed bugs: a hardcoded five-destination keyword list, and a free-text follow-up that discarded the prior scenario instead of extending it. Both are fixed in this pass, see below.

## What was implemented

### 1. AI provider abstraction and tool-calling gateway (`lib/ai/provider.js`, `lib/ai/tools.js`)

`lib/ai/provider.js` is a real, working integration with both OpenAI and Anthropic's SDKs (`openai` and `@anthropic-ai/sdk`, added as real dependencies), selected by an `AI_PROVIDER` environment variable, with per-task model routing (`fast`, `standard`, `reasoning`, the last defaulting to GPT-6 Astra for OpenAI) overridable via `AI_MODEL_FAST` / `AI_MODEL_STANDARD` / `AI_MODEL_REASONING`. `isConfigured()` checks for an actual API key, not just a provider name. As of this build, `.env` has no `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`, so `isConfigured()` returns false and every caller falls back to real, tested deterministic behavior instead of a live model call. This was never tested against an actual model response, since no key exists in this environment, that is the one honest limitation of this entire report: the tool-calling wire format (OpenAI function calling, Anthropic tool use, including the multi-round tool-result loop) is implemented to each provider's documented protocol, but has not been exercised end to end against a live API.

`lib/ai/tools.js` defines eleven tools (`getFleet`, `getVehicle`, `checkAvailability`, `calculateRentalPrice`, `getBooking`, `getDestination`, `geocodeLocation`, `calculateRoute`, `createBookingRequest`, `requestBookingChange`, `transferToHuman`), each a thin wrapper around an existing, already-tested function in `lib/db/*` or `lib/geo/provider.js`, never a new parallel implementation of pricing or availability logic. `createBookingRequest` calls the same `createBooking()` the public `/book` form uses, always status `PENDING`, tagged with a new `source: "ai_assistant"` value so admin can see where a request came from. `requestBookingChange` never touches the bookings table, it posts a message into the support conversation and marks it `WAITING_FOR_ZEBRA`, matching the spec's own worked example exactly. Three more tools (`getVehicleUtilization`, `getPopularDestinations`, `getAverageTripDistance`, see business analyst section below) are gated `requiresAdmin: true` and refused for any context that is not an authenticated admin.

### 2. Knowledge base (`lib/db/knowledge.js`, `/admin/knowledge`, `app/api/knowledge/*`)

A new `knowledge_articles` table (category, title, body, published) with full admin CRUD at `/admin/knowledge`, reusing the exact list/form pattern the existing FAQ admin page uses. Retrieval (`findRelevantArticles`) is real lexical scoring, not embeddings, since no provider key exists to generate embeddings with. Tested live and one real bug was found and fixed during that testing: the first version matched an article on a single shared common word ("car", "rent"), which made "What is your policy on pets in the car?" wrongly return the "documents needed to rent a car" article. Fixed by requiring at least two distinct matched words, re-tested, confirmed the false match is gone and the genuine match still works. The table starts empty on this build. No Zebra policy text has been invented anywhere, per the project's standing rule; the admin who publishes here is providing the real source of truth the AI will quote from.

### 3. Zebra AI Support (`lib/ai/support.js`, `lib/ai/escalation.js`, `app/api/ai/support/route.js`, `components/ZebraAISupportWidget.js`)

A floating chat widget on every customer-facing page (mounted in `app/(site)/layout.js`), styled with Zebra's existing brand tokens (`--zebra-yellow`, `--forest-dark`), deliberately not a neon or purple AI aesthetic. Each conversation is a real `support_conversations` row with real `support_messages`, not client-only state, so an admin can see it from `/admin/support`.

Deterministic escalation rules (`lib/ai/escalation.js`) run before any attempt to answer: explicit human requests, vehicle damage or accidents, insurance claims, legal matters, payment disputes, and complaints all escalate immediately to a real Zebra staff member, matching the spec's explicit instruction not to rely on a self-reported AI confidence number. For everything else, `handleSupportMessage()` retrieves relevant knowledge, then either runs the real tool-calling loop against a configured provider, or, since none is configured today, runs a deterministic fallback that quotes a matched knowledge article, computes a real price when a vehicle and a duration are both mentioned (reusing the What If parser's own entity extraction), or honestly says it cannot confirm the answer and offers to connect the customer with the team.

### 4. Human escalation and admin console (`/admin/support`, `app/api/support/conversations/*`)

A real inbox at `/admin/support`, filterable by status (New, AI handled, Waiting for customer, Waiting for Zebra, Escalated, Resolved), each conversation showing the AI's summary, the linked customer and booking when known, and the full message transcript. Take over, reply, resolve, and close all write real rows. Verified live: taking over a conversation sets `assigned_agent_id`, and a subsequent customer message to that same conversation is confirmed to return `handledBy: "human"` with no AI-generated reply, the AI genuinely stops responding once a human owns the thread, this was not just assumed from the code, it was tested end to end with real HTTP requests.

### 5. AI Trip Planner integration (`app/api/ai/trip-plan/route.js`, `components/TripPlanner.js`)

A "Describe your trip" box added to the top of the real Trip Planner page. Tested with the exact sentence from the specification ("I am coming to Rwanda for 10 days with my wife. We arrive at Kigali Airport and want to visit Akagera, Musanze and Lake Kivu.") and confirmed live, both via the API directly and by driving the actual page with Playwright: it correctly extracted 2 adults, 10 days, an airport pickup, and added Akagera National Park, Kigali, Lake Kivu, and Volcanoes National Park (Musanze's real alias) as real stops on the actual map and itinerary, not a separate preview. This reuses the same rule-based parser What If already uses, extended in the next section, it is not a second, untested implementation, and it carries the same honest limitation: unusual phrasing a real connected model would understand can still be missed.

### 6. What If fixes (`lib/whatIf/parseScenario.js`, `app/api/what-if/analyze/route.js`, `components/WhatIfExplorer.js`)

Two real, previously-reported bugs fixed and re-verified live:

**Hardcoded destination list.** `parseScenario()` now accepts a live alias map built from Zebra's actual published destinations (`buildDestinationAliases()`), instead of a fixed five-name list. Verified live: created a test destination named "Rubavu" (a real Rwandan town the original audit confirmed the old parser could never recognize), asked What If about it, confirmed it was correctly recognized, then removed the test destination.

**Context reset on a follow-up.** The exact scenario from the specification was reproduced and fixed. Submitted "Kigali to Akagera to Kigali", then "What if I add Lake Kivu?": before the fix, the second call ignored the first entirely (`destinations: ["Lake Kivu"]` only). After the fix (a new `mergeScenarios()` function, plus the client now sending the previous scenario back to the server), the same follow-up correctly produced `destinations: ["Akagera National Park", "Kigali", "Lake Kivu"]`. A "Start a new scenario" button was added since, without one, a customer would have no way to deliberately reset instead of accumulate, this was the one UI change made and it is functionally necessary, not decorative.

**Route, distance, time, and mileage impact**, previously never computed by What If under any circumstance, are now real. When a scenario names two or more destinations, the route calls the real routing provider (`lib/geo/provider.js`, the same one Trip Planner uses) for genuine distance and duration, and projects mileage overage cost against the recommended vehicle's real mileage policy. Tested with temporarily-set real coordinates (Kigali's public city-center coordinates and Akagera National Park's, both real and verifiable, removed after the test): confirmed the code correctly selects points with real coordinates, correctly reports which destinations are missing one (an honest gap, most seeded destinations have none yet, unrelated to this fix), and correctly attempts the real routing call, which failed only because this sandbox's network policy blocks the routing provider's domain, the same environment limitation the original audit already reported, not a new defect.

### 7. Business analyst groundwork (`lib/db/businessAnalytics.js`, admin AI What If page)

Three real aggregate queries (vehicle utilization, popular destinations, average routed trip distance), exposed both as admin-gated AI tools and as a plain display on the existing `/admin/ai/what-if` page. `getAverageTripDistance()` returns an honest `sampleSize: 0` with a plain explanation rather than a misleading `0 km` when no booking yet has a real routed distance on file. No number here is fabricated; on a fresh database every one of these correctly reports "no data yet" rather than inventing a statistic.

## Database changes

Four new tables, added to both `prisma/schema.sql` and `prisma/schema.postgres.sql` with `CREATE TABLE IF NOT EXISTS`, so they apply automatically on next startup against either database, matching this codebase's existing dual-driver pattern exactly: `knowledge_articles`, `support_conversations`, `support_messages`, `ai_interaction_log`. One additive change to an existing table: `bookings.source` now also accepts `"ai_assistant"` alongside the existing `"online_request"` and `"staff_entered"` values, no schema change needed since it was already a plain TEXT column.

## API changes

New: `POST/GET /api/ai/support`, `POST /api/ai/trip-plan`, `GET/POST /api/knowledge`, `PATCH/DELETE /api/knowledge/[id]`, `GET /api/support/conversations`, `GET/PATCH /api/support/conversations/[id]`. Modified: `POST /api/what-if/analyze` now accepts an optional `previousScenario` field and returns an additional `route` field.

## Credentials required to actually go live

Nothing in this build works against a real AI model today. To connect one: set `AI_PROVIDER` to `openai` or `anthropic` in `.env`, and the matching `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`. Nothing else changes, `isConfigured()` will then return true and `lib/ai/support.js` will start running the real tool-calling loop instead of its deterministic fallback, with no code change needed anywhere else in the system, that separation was the point of building the provider abstraction first. Optionally, `AI_MODEL_FAST` / `AI_MODEL_STANDARD` / `AI_MODEL_REASONING` override the default model chosen per task tier.

## What remains

The tool-calling loop against a live OpenAI or Anthropic response has not been exercised, since no key exists in this environment, this needs a real smoke test the first time a key is added, ideally against each of the ten conversations in the specification's own test list. The deterministic fallback, while honest, cannot cover every phrasing the way a connected model would: "I want to change my pickup time," "I am arriving at 18:30," and "which car should I take" all correctly avoid inventing an answer today but do not resolve the question either, that gap closes automatically once a provider is connected. Most seeded destinations still lack real coordinates, unrelated to this pass, which limits how often the new route/mileage calculation in What If has anything to compute against. No knowledge articles are published yet, Zebra's own real policy text needs to be written and published at `/admin/knowledge` before AI Support can answer policy questions from anything but its own honest "I can't confirm that" fallback.

## Test data cleanup

All test knowledge articles, test destinations, and temporarily-set test coordinates created during this session's live testing were unpublished, deleted, or reverted before this report was written, confirmed by direct database queries. The local test database (`prisma/dev.db`) used for this session's testing was deleted afterward; it is gitignored and never part of what gets deployed regardless.
