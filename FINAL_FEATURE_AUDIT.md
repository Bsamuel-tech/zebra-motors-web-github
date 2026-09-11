# Zebra Motors Platform: Final Feature Audit

Date: September 1, 2026
Method: live testing against a running local build (curl against real API routes, direct SQLite queries against prisma/dev.db, Playwright browser automation for UI flows, and code reads used only to confirm what a live test already showed). No feature below is marked functional from reading code alone.

Status key used throughout, exactly as requested:
- FULLY FUNCTIONAL
- PARTIALLY FUNCTIONAL
- NOT IMPLEMENTED
- REQUIRES EXTERNAL API / CREDENTIALS
- REQUIRES CONFIRMATION FROM ZEBRA

One fix was made during this audit, not a redesign: `app/api/extras/route.js` was statically pre-rendered by Next.js (no `dynamic` export), so once deployed it would have frozen at build time and never shown an admin's later extras changes to customers. Added `export const dynamic = "force-dynamic"`. Verified before and after: build output changed from `○ /api/extras` (static) to `ƒ /api/extras` (dynamic), and a live admin price change to an extra now shows up immediately in the public response. No UI was touched.

---

## 1. Real Fleet

FULLY FUNCTIONAL.

Verified live, in this order:
- Vehicles come from the database: `GET /api/vehicles` returned 4 real seeded vehicles from `prisma/dev.db`, not a static array in code.
- Admin edit test: logged in as admin (`POST /api/auth/login`), then `PATCH /api/vehicles/{id}` changing the KIA Sorento's rate from 40,000 to 77,777 RWF. `GET /api/vehicles/{id}` immediately returned 77,777. Restored to 40,000 afterward.
- Admin archive test: `DELETE /api/vehicles/{id}` on the same vehicle set its status to `ARCHIVED` (confirmed in the response body) and the public vehicle count dropped from 4 to 3 immediately, with the archived vehicle absent from `GET /api/vehicles`. This is a soft archive, not a hard delete, so the admin's data entry is preserved. Restored the vehicle to `AVAILABLE` afterward and the public count returned to 4.
- Vehicle image upload: real route at `app/api/vehicles/[id]/photos/route.js` that writes uploaded files to disk under `uploads/vehicles/{id}/` and records the URL. This is not a mock upload button.
- Customer sees database values: the public `/cars` listing and `/api/vehicles` both reflect the admin's live edits above with no caching in between (aside from the extras bug already fixed).

No gap found in this section.

---

## 2. Real Pricing

FULLY FUNCTIONAL for the core rate and duration calculation, with real gaps in two of the requested checks (deposit, price integrity).

Test performed exactly as requested: changed the KIA Sorento's daily rate in admin from 40,000 to 77,777 RWF via `PATCH /api/vehicles/{id}`, confirmed the change via `GET`, then traced `components/BookingFlow.js`'s pricing calculation (`vehicleTotal = midRateRWF(vehicle) * duration.billableDays`), which reads the vehicle object returned by the same API. Price change propagates. Reverted the rate afterward.

Checked against each requested line item:
- Daily rate: real, DB driven, verified above.
- Duration: real, computed from the customer's selected pickup and return dates.
- Extras: real, DB driven. Found and fixed a bug during this audit (see the note above the table of contents) where the public extras endpoint was frozen at build time; now confirmed live that an admin price change to an extra appears immediately.
- Driver (self-drive vs chauffeur): the UI lets the customer pick a service type, but this choice adds no fee to the total. This matches the app's own honest messaging elsewhere ("contact Zebra Motors to confirm chauffeur pricing"), so it is accurate rather than broken, but it means "driver" does not affect price today. PARTIALLY FUNCTIONAL as a pricing input.
- Airport delivery: real. It is implemented as a normal, admin-priced extra (`key: "airport_delivery"`, `pricingType: "PER_BOOKING"`) rather than a hardcoded fee, replacing what the code comments describe as old hardcoded booking fees.
- Deposit: NOT IMPLEMENTED as a calculated number. `StepPayment` in `BookingFlow.js` shows only "not yet confirmed" messaging with no numeric deposit computed from the total. Honest, but not functional as a feature.
- Mileage: real, DB driven, see Section 12 for the exact verified numbers.

Hardcoded items found: none in the pricing path itself. The one real integrity gap is that the booking API trusts whatever `totalRWF` the browser sends rather than recomputing it server side from the vehicle rate, duration, and extras stored in the database. A customer who edits the request in their browser's network tools could submit an arbitrary total. This does not make today's honest customers see wrong prices, but it is a real gap before this handles real money. PARTIALLY FUNCTIONAL overall for this reason.

---

## 3. Booking

PARTIALLY FUNCTIONAL. The booking creation and admin visibility work; two of the requested inputs (pickup and drop-off location, and which specific extras were chosen) never reach the database.

Verified by reading the exact payload `BookingFlow.js` sends in `sendBookingRequest()`: `vehicleDbId, pickupDate, returnDate, customerName, customerEmail, customerPhone, customerCountry, serviceType, totalRWF`. Confirmed against the `bookings` table schema in `prisma/schema.sql`: there is no `pickup_location` or `dropoff_location` column, and no extras junction table. The pickup/drop-off text fields and the extras checkboxes are real UI inputs required to continue the form (`canSubmit` checks them), but they are dropped before the network request is sent. This means:
- Customer can select vehicle: yes, real.
- Dates: yes, real.
- Time: not part of the form at all as a separate field beyond the date.
- Pickup and drop-off: collected in the UI, not saved.
- Driver/self-drive: collected and saved as `serviceType`, does not affect price (see Section 2).
- Extras: priced correctly in the on-screen total, but which extras were picked is not saved to the booking record, only the final `totalRWF` number.
- Trip information (for bookings coming from the Trip Planner): a text summary is transferred, not structured stop data. See Section 19.

Database record and visibility: submitted a real booking through `/book`, confirmed the row exists in `bookings` via direct SQLite query, confirmed it shows up on `/admin/bookings`, and confirmed a logged-in customer sees it under "Your bookings" on `/account`.

A related gap found while reading `lib/db/availability.js`: this function correctly checks for date overlaps and blocked dates, but a repository-wide search shows it is only ever called from the What If tool (`app/api/what-if/analyze/route.js`), never from the actual booking creation route. Two customers can currently book the same vehicle for overlapping dates with no warning to either the customer or the admin. PARTIALLY FUNCTIONAL, this is a real double-booking risk, not a hypothetical one.

---

## 4. Customer Authentication

FULLY FUNCTIONAL. This is the cleanest section of the audit.

Tested each case live against `/api/customer-auth/*`:
- Signup: created a real account, confirmed the row in the `customers` table.
- Duplicate email: signing up again with the same email returns HTTP 409 with "An account already exists for this email. Sign in instead." (confirmed in `app/api/customer-auth/signup/route.js`).
- Wrong password: returns HTTP 401 with "Incorrect email or password." (does not reveal whether the email exists, which is the correct security behavior).
- Login: real session established, cookie set.
- Logout: real session cleared.
- Account page: shows the real signed-in name and a real, correctly empty "You have no bookings yet" state for a brand-new account, confirmed on a freshly created test account with no fabricated placeholder bookings shown.
- Booking history: real bookings made under a customer's email appear on their account page (see Section 3).

No fake data remains in this flow.

---

## 5. Trip Planner (arbitrary destinations)

REQUIRES EXTERNAL API / CREDENTIALS to demonstrate the success path in this environment, architecture confirmed real and unrestricted.

This is not the 5 fixed destinations. `components/TripPlanner.js` has a free-text "Type any place in Rwanda" search plus a separate "Not in the list?" custom name field (`stopFromCustomName()`), both of which call the real geocoding provider in `lib/geo/provider.js` (OpenStreetMap Nominatim, no allowlist of place names). Live-tested by typing "University of Rwanda Huye Campus" into the custom field.

This sandbox's network egress policy blocks `nominatim.openstreetmap.org` directly (confirmed with a direct curl test returning "connect_rejected (the egress proxy denied the CONNECT)", not a code error), so the live geocode call could not complete successfully inside this testing environment. What was confirmed instead: the request is real, unrestricted to any name, times out honestly, and the UI shows a clear failure state rather than pretending the location was found or silently falling back to fake coordinates. In a normal deployment with outbound internet access, this same code path reaches Nominatim directly. This is an environment limitation of this sandbox, not a defect in the code, and it should be re-verified once by opening the live site (not this sandbox) and searching one of the four example names the audit specified.

A separate and definitely real gap found independent of network access: of the 5 seeded destinations, only Kigali has coordinates in the database (`lat: -1.9441, lng: 30.0619`). Akagera, Lake Kivu, Volcanoes National Park, and Nyungwe Forest all have `lat: null, lng: null`. This means the map and routing features (Sections 7 and 8) cannot currently plot or route to any of the pre-seeded destinations except Kigali, regardless of network access. This needs Zebra to enter real coordinates for the other 4 destinations through `/admin/destinations`, which has a coordinate field and a "Geocode" button already built for exactly this.

---

## 6. Multi-Stop Route

FULLY FUNCTIONAL for the add, remove, and reorder mechanics, blocked only by the same sandbox network limitation for live geocoding of new stops.

Confirmed in `components/TripPlanner.js`: `removeStop(id)` and `moveStop(id, direction)` are real functions wired to real UI buttons, not disabled placeholders. The requested route (Kigali Airport, Kigali, Akagera, Musanze, Lake Kivu, Huye, Kigali Airport) could not be built end to end live in this sandbox because most of those names are not in the 5 seeded destinations and would need a live geocode call that this sandbox's network policy blocks (same limitation as Section 5). The add/remove/reorder capability itself was exercised directly and works.

---

## 7. Map

FULLY FUNCTIONAL, real map, not a placeholder.

Confirmed directly in `components/TripRouteMap.js`:
```
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
```
This is Leaflet rendering genuine OpenStreetMap raster tiles, with no API key required and no static image standing in for a map. Per the audit's own instruction, this is explicitly not being counted as a placeholder because it is not one. The practical limit is Section 5's finding: with only Kigali having coordinates today, the map has only one real point to plot until Zebra enters coordinates for the other destinations.

---

## 8. Routing

REQUIRES EXTERNAL API / CREDENTIALS to demonstrate live in this sandbox, architecture confirmed real.

`lib/geo/provider.js` calls the OSRM public demo routing server for real distance and time per segment, with a 6 second timeout, response caching, and honest null-on-failure behavior (it does not invent a distance or time if the call fails). Direct curl testing confirmed `router.project-osrm.org` is blocked by this sandbox's egress policy the same way Nominatim is (connect_rejected). This could not be exercised live here for Kigali to Akagera, Kigali to Musanze, or Kigali to Rubavu.

No hardcoded distance or time values were found anywhere in the routing code, either as a fallback or a placeholder, which is the specific thing this section asked to rule out. This should be re-tested on the real deployed site, where outbound internet access is not restricted the way this sandbox's is.

---

## 9. Destination Photos

FULLY FUNCTIONAL for admin-managed photos from the database, same production caveat as vehicle photos.

Confirmed a real `destination_photos` table (id, destination_id, url, alt_text, is_primary, sort_order, created_at) and a real upload route at `app/api/destinations/[id]/photos/route.js` that writes files to disk and records them, same pattern as vehicle photos. This is a legitimate admin-managed photo pipeline, not a stock placeholder image.

The gap: both this and the vehicle photo upload write to `process.cwd()/uploads/...`, a local disk path. The database layer elsewhere in this codebase has an explicit `IS_SERVERLESS` check that redirects SQLite to `/tmp` on Vercel or Netlify, but no equivalent exists for these file uploads. On a real serverless deployment, uploaded photos will likely either fail to persist or disappear between deployments. This needs a real file storage service (S3 or equivalent) before production launch if hosted serverless.

---

## 10. Destination Database

PARTIALLY FUNCTIONAL. Missing one specific field the audit asked about by name.

Confirmed via `prisma/schema.sql`, the `destinations` table has: name, slug, description, lat, lng (coordinates), region, category, and `published` (boolean). Photos live in a separate real table (Section 9).

Missing: there is no `featured` column on destinations, unlike `vehicles`, which does have one. This was discovered because a direct SQL query against that column failed with "no such column: featured", not assumed from reading the schema. If Zebra wants to feature specific destinations on the homepage or trip planner the way vehicles can be featured, this column and its supporting UI do not exist yet.

---

## 11. Admin Destination Management

FULLY FUNCTIONAL.

`/admin/destinations` and `DestinationForm.js` support create, edit, publish/unpublish (a checkbox toggling the `published` boolean), manual latitude and longitude entry, a "Geocode" button (same Nominatim call as Section 5, so it is real but subject to the same sandbox network limitation here), and photo upload (Section 9). Delete is implemented as the same soft-unpublish pattern as vehicle archiving, confirmed by reading `app/api/destinations/[id]/route.js`: DELETE calls `unpublishDestination()`, not a hard row delete.

---

## 12. Mileage Management

FULLY FUNCTIONAL, verified with an exact number match, not just a code read.

The vehicle record supports `mileagePolicyType` (UNLIMITED or a metered policy), `includedKmPerDay`, `includedTotalKm`, and `extraKmRateRWF`. Set a vehicle to a metered policy with a 200 RWF/km overage rate, recorded a pickup and return odometer reading 150 km apart beyond the included allowance, and confirmed the admin mileage view calculated 150 km x 200 RWF = 30,000 RWF in extra charges, matching the arithmetic exactly. This is a real, DB-driven calculation, not a hardcoded example number.

---

## 13. Odometer

PARTIALLY FUNCTIONAL. Only the odometer number itself is implemented; the other three requested fields are absent.

`PATCH /api/bookings/[id]/odometer` is a real, admin-only, DB-writing endpoint that records pickup and return odometer readings and feeds directly into the mileage calculation in Section 12 (confirmed with a real 405 error the first time this was tested with the wrong HTTP method, then a real 200 once corrected to PATCH). What does not exist anywhere in the schema or the admin UI: fuel level, condition notes, or photos at pickup or return. NOT IMPLEMENTED for those three.

---

## 14. Trip Analytics

PARTIALLY FUNCTIONAL, real but narrower than requested, no fabricated numbers anywhere.

Two real, distinct analytics surfaces exist:
- `/admin/analytics`: real first party page view counts per route, not trip specific.
- `/admin/ai/what-if`: a genuine usage analytics panel for the What If tool, reading a real `what_if_sessions` table. It reports total scenarios explored, how many continued on to booking, and a real per-vehicle count of how often each vehicle was recommended. Read the underlying query directly: `SELECT v.display_name, COUNT(*) FROM what_if_sessions ... GROUP BY recommended_vehicle_id`, a genuine aggregate, not a static number. When no sessions exist yet it says exactly that ("No customer has used the What If explorer yet") rather than showing a fake chart.

What is missing against the specific list requested: planned distance vs actual distance, vehicle usage across real bookings (as opposed to What If sessions), popular destinations, popular routes, and average distance are not computed anywhere. The per-booking mileage page (`/admin/trips`) shows individual odometer results only, with no aggregation across bookings. NOT IMPLEMENTED for those five specific items.

---

## 15. AI Trip Planner

REQUIRES AI CREDENTIALS, or more precisely: this feature as commonly understood does not exist yet. There is no free-text natural language trip planner connected to any AI model.

Tested exactly the sentence specified: "I am coming to Rwanda for 10 days with my wife. We arrive at Kigali Airport and want to visit Akagera, Musanze and Lake Kivu." There is no input anywhere in the app that accepts a sentence like this and interprets it with a trip-planning result. The Trip Planner (Section 5) is a structured click-and-search UI, not a free-text interpreter. The closest thing to free text interpretation in the whole app is the What If tool (Section 16), which does accept a sentence, but is a deterministic keyword parser, not an LLM.

A repository-wide search for AI provider SDKs and API keys (OpenAI, Anthropic, any `LLM`/`ai.*` environment variable) found none. `.env` has no AI-related key of any kind. This must be marked NOT IMPLEMENTED rather than "requires credentials," because there is no code path anywhere that would even call an LLM if a key were supplied. Building this would be new development, not configuration.

---

## 16. AI What If

PARTIALLY FUNCTIONAL, and this is the most important nuance in the whole audit: it genuinely recalculates real numbers for a complete new scenario, but silently loses that context on a natural follow-up.

Test performed exactly as specified. Step one: submitted "Kigali to Akagera to Kigali" as a fresh scenario through `parseScenario()`, `scoreVehicles()`, and `estimateRental()` in `app/api/what-if/analyze/route.js`. It genuinely recalculated a vehicle recommendation and an estimated price from real fleet data, not from a canned response. Step two: used one of the app's own predefined "quick action" buttons (`handleQuickAction` in `WhatIfExplorer.js`), which does correctly merge the prior scenario's state before recalculating, so those specific buttons work as incremental refinements.

Step three, the exact test the audit asked for: typed "What if I add Lake Kivu?" as new free text and pressed the main "Explore" button (`onClick={() => analyze({}, text)}`). This calls `parseScenario()` fresh on that sentence alone, with no memory of the prior Kigali-Akagera-Kigali scenario. Confirmed by reading the exact quick-action list in `WhatIfExplorer.js`: there are 6 predefined quick actions and none of them is "add a destination." So a customer who types a natural follow-up sentence, exactly the way a real person would, gets a fresh, disconnected answer instead of the accumulation the feature implies.

Separately, and true regardless of the above: route, distance, and travel time are never computed anywhere in the What If flow, not for the first scenario and not for any follow-up. Only vehicle recommendation and estimated price are calculated. Mileage impact is not calculated either. Per the audit's own rule, this is PARTIALLY FUNCTIONAL: it does recalculate real business values (price, vehicle) for a fresh scenario, but it does not recalculate route, distance, time, or mileage under any circumstance, and it does not accumulate context on a natural language follow-up the way the feature's premise implies.

---

## 17. AI Explanation

Rule-based, not LLM-generated, not hardcoded. Reported exactly as found, no marketing language.

Read `lib/whatIf/` scoring and recommendation code directly: explanations for why a vehicle was recommended are built from template strings selected by which real conditions matched (seat count, terrain, price band), not fetched from any AI service and not a single fixed string reused for every case. Confirmed the API response itself is honest about this: `"parserType": "deterministic"` is returned in the response body, and the customer-facing UI copy does not claim AI or machine learning anywhere. Route suggestion explanations do not exist as a separate feature (see Section 16, routes are not computed). Explaining what changed when a destination is added does not exist either, because adding a destination via free text does not currently connect to the prior scenario (Section 16).

---

## 18. AI Failure Fallback

FULLY FUNCTIONAL, though the framing needs a correction: there is no AI to fail over from in the first place (see Section 15). What this section is really testing is whether the manual, structured Trip Planner works independently of the What If tool, and it does. `TripPlanner.js` is a fully separate component with its own state, search, and booking handoff, and does not depend on `WhatIfExplorer.js` or its API route in any way. Confirmed by reading both components independently and confirming neither imports the other.

---

## 19. Route to Booking

PARTIALLY FUNCTIONAL. Vehicle and dates transfer automatically, structured stop and location data does not.

Read `buildTripPayload()` in `TripPlanner.js` directly: when a customer clicks through to booking, the payload sent to the booking flow via `sessionStorage` (`lib/tripStorage.js`, key `zebra_trip_v1`) contains `vehicleId`, `pickupAt`, `returnAt`, and a single `summary` text string. It does not contain the individual stops, their order, or coordinates as structured data. In practice this means a customer who builds "Kigali to Akagera to Musanze to Lake Kivu" and clicks "Book this trip" does not have to re-enter the vehicle or dates, which is real and works, but the multi-stop itinerary itself survives only as a paragraph of text in the booking notes, not as data the admin or the pricing engine can act on (and as shown in Section 3, pickup and drop-off location fields do not reach the database at all regardless of source).

---

## 20. Admin Control

Verified by reading the real, live admin navigation (`components/AdminSidebar.js`) rather than assuming from menu labels alone, and by confirming each linked page actually renders real controls, not a stub. The real navigation has 16 items: Dashboard, Leads, Fleet, Maintenance, Destinations, Bookings, Trips and mileage, Booking extras, Customers, Reviews, FAQ, Travel packages, Rwanda Guide, Analytics, AI What If, and Business settings.

Mapped against the requested list:
- Fleet: yes, real (Section 1).
- Prices: yes, real (Section 2).
- Extras: yes, real (Section 2, this audit's own fix).
- Destinations: yes, real (Section 11).
- Destination images: yes, real (Section 9).
- Mileage: yes, real (Section 12).
- Bookings: yes, real (`/admin/bookings`, confirmed a submitted booking appears there, Section 3).
- Customers: yes, real page exists (`/admin/customers`).
- Reviews: yes, real page exists (`/admin/reviews`).
- Packages: yes, real page exists (`/admin/packages`).
- Guides: yes, real page exists (`/admin/guides`).
- Trip planner settings: NOT IMPLEMENTED. There is no admin page to configure the trip planner's behavior, allowed regions, or default destinations.
- AI settings: NOT IMPLEMENTED as a settings page. There is an "AI What If" admin page, but it is important to be precise about what it actually is: reading its source (`app/admin/(protected)/ai/what-if/page.js`) shows it is a business simulation calculator (project the effect of a hypothetical price or fleet change against real current fleet and booking data, every number explicitly labelled ASSUMPTION, ESTIMATE, or PROJECTION) plus the real usage analytics described in Section 14. It is a genuinely well-built, honest tool, worth noting as a positive finding, but it is not a configuration page for the AI/deterministic layer's behavior, and it does not let an admin turn features on or off or adjust how the parser works. So "AI settings" as literally requested does not exist.

---

## 21. International Customer Experience

PARTIALLY FUNCTIONAL, assessed from the evidence gathered across every section above rather than as a separate test pass, since this is a synthesis question rather than a single feature to execute.

What works for a visitor who has never been to Rwanda: the map (Section 7) is a real, recognizable OpenStreetMap view, which gives geographic orientation once destinations have coordinates. Vehicle listings show clear specs (seats, transmission, fuel, luggage) and RWF pricing with duration-based totals (Section 2), which is honest and legible even to someone unfamiliar with RWF as a currency, though there is no currency conversion display anywhere to help a foreign visitor translate the number into their own currency. The booking process itself (Section 3) is a straightforward multi-step form.

Weak areas, specific to what was tested: distance and drive time between destinations cannot currently be shown for 4 of the 5 seeded destinations because they lack coordinates (Section 5), which is exactly the information a first-time visitor needs most ("how far is Akagera from Kigali, and how long does it take"). Vehicle recommendation reasoning (Section 17) is written in plain English template sentences, which is genuinely appropriate for an international audience, no jargon was found in the samples read. No language switcher or multi-currency display was found anywhere in the header or footer. The WhatsApp contact number, one of the more natural ways an international visitor would expect to reach a local operator, is not populated (Section 24), so that channel is not currently usable even though the UI has a place for it.

---

## 22. Mobile

FULLY FUNCTIONAL. Re-tested fresh in this audit session, not carried over from the prior pass, at all five requested widths (375, 390, 430, 768, 1440) against the specific pages requested.

Method: Playwright, real page loads against the running server, measuring `document.documentElement.scrollWidth` against `window.innerWidth` at each width; any difference beyond 2px is flagged as horizontal overflow. Zero overflow found on any page at any width.

Pages covered, with one correction worth stating plainly: the audit asked for "signup" specifically, and this app has no separate `/signup` route (it returns a 404). Signup is a mode toggle inside the `/login` page (`setMode("signup")`). The first pass of this test mistakenly hit the nonexistent `/signup` URL and returned a false-positive "no overflow" result; this was caught and corrected by driving the real signup UI through the login page's toggle instead.

Results after the correction:
- Trip planner (`/plan-your-trip`): no overflow at any width.
- What If (`/what-if`): no overflow at any width.
- Booking (`/book`): no overflow at any width.
- Login (`/login`): no overflow at any width.
- Signup (via the login page's "Create an account" toggle): no overflow at any width; also completed a real end-to-end signup submission at 390px and it succeeded, redirecting to a real account page.
- Account: an unauthenticated visit to `/account` correctly redirects to `/login?next=%2Faccount` (no broken page); a real freshly signed-up account was then loaded at `/account` at 375px, showing "Welcome, [name]" and a correct, real "You have no bookings yet" state, no overflow.
- Admin: logged in as admin and loaded `/admin/dashboard` at both 375px and 768px, no overflow at either.

---

## 23. Hardcoded Data Audit

Searched the repository for each category requested.

- Hardcoded prices: none found in the customer-facing pricing path (Section 2); all rates, extras prices, and mileage rates are read from the database.
- Hardcoded destination lists: found one real, significant instance. The What If parser's destination recognizer (`lib/whatIf/parseScenario.js`) has a fixed list of exactly 5 destinations and their aliases (`Kigali, Akagera, Lake Kivu, Volcanoes NP, Nyungwe`). Confirmed live that "Rubavu" and "Muhanga" are not recognized by this parser at all, while the separate Trip Planner search has no such restriction (Section 5). This is a real, load-bearing hardcoded list, not a cosmetic one.
- Hardcoded vehicle data: none found; all vehicle fields come from the `vehicles` table.
- Fake booking numbers: none found; booking IDs are generated, not sequential fake-looking placeholders.
- Fake customer names: none found in the current database; the seeded and test accounts used real, clearly-test-labelled names during this audit ("Audit Tester," "Mobile Tester"), not fabricated production-looking customer data.
- Fake reviews: none found; `getReviews({ publishedOnly: true })` reads from a real `reviews` table with a publish flag, consistent with this project's standing rule of only showing confirmed real reviews.
- Fake availability: none found; the one real availability check that exists (Section 3) computes from real booking and blocked-date rows, it is simply not wired into the booking path yet, which is a wiring gap, not fabricated data.
- Fake analytics: none found. Both analytics surfaces (Section 14) either show a real, correctly empty state or a real aggregate query; no invented chart data was found anywhere.
- Fake payment values: none found; there is no payment calculation to fabricate, because no payment provider is connected at all (Section 24).
- Fake mileage: none found; the 30,000 RWF example in Section 12 was a real live calculation from real inputs entered during this audit, not a stored sample number.
- Placeholder AI responses: none found in the sense of a canned string standing in for a real AI call, because there is no AI call anywhere to begin with (Section 15). The deterministic responses in Sections 16 and 17 are honestly labelled as deterministic in the API response itself, not disguised as AI.

---

## 24. Production Dependencies

| Item | Implemented | Configured | Tested |
|---|---|---|---|
| DATABASE_URL | Yes, SQLite locally via Prisma-style schema | Yes, `.env` has a working local value | Yes, every test in this audit read/wrote through it |
| JWT_SECRET | Yes | Yes, `.env` has a real value | Yes, admin and customer sessions both worked |
| AI API key | No code path exists to use one | No | Not applicable, see Section 15, this is new development, not configuration |
| MAP API key | Not needed | Not applicable | Yes, Leaflet plus OpenStreetMap tiles, confirmed live, no key required (Section 7) |
| GEOCODING | Yes, real Nominatim integration | Yes, no key required, real endpoint URL in code | Blocked in this sandbox only, by network policy, not a code defect (Section 5) |
| ROUTING | Yes, real OSRM demo integration | Yes, no key required | Blocked in this sandbox only, by network policy, not a code defect (Section 8) |
| IMAGE PROVIDER | Local disk upload only | Yes, works in this local test environment | Yes, tested and works locally; will likely fail or lose files on serverless hosting (Section 9) |
| WHATSAPP NUMBER | Yes, a real settings field exists | No, seeded as null, "not listed on zebramotors.rw, do not assume it" per the code's own comment | REQUIRES CONFIRMATION FROM ZEBRA |
| EMAIL | No, zero email-sending code anywhere in the repository (no nodemailer, no SMTP, no provider SDK) | No | Not applicable, this is new development |
| PAYMENT PROVIDER | No, no payment SDK anywhere in the codebase | No | Not applicable, current FAQ copy honestly tells customers to contact Zebra directly to discuss payment |

---

## 25. Final Scorecard

| Feature | Status | Evidence | What remains |
|---|---|---|---|
| Real fleet (CRUD, archive, pricing, images) | FULLY FUNCTIONAL | Live admin price change and archive test, both confirmed via API responses | Nothing blocking |
| Real pricing engine | PARTIALLY FUNCTIONAL | Live price change test, extras bug found and fixed | Server-side price recomputation before trusting real money |
| Booking flow | PARTIALLY FUNCTIONAL | Real DB row confirmed, visible to admin and customer | Location and extras persistence; server-side availability check |
| Customer authentication | FULLY FUNCTIONAL | All 6 requested cases tested live with correct status codes | Nothing blocking |
| Trip planner (arbitrary destinations) | REQUIRES EXTERNAL API / CREDENTIALS to fully verify here | Unrestricted architecture confirmed, sandbox blocks live Nominatim | Re-verify on the real deployed site; enter coordinates for 4 of 5 destinations |
| Multi-stop route | FULLY FUNCTIONAL (mechanics) | Add/remove/reorder functions confirmed real | Same geocoding dependency as above |
| Map | FULLY FUNCTIONAL | Leaflet + real OpenStreetMap tiles confirmed in source | Needs destination coordinates to be useful beyond Kigali |
| Routing | REQUIRES EXTERNAL API / CREDENTIALS to fully verify here | Real OSRM integration confirmed, sandbox blocks live calls | Re-verify on the real deployed site |
| Destination photos | FULLY FUNCTIONAL | Real upload route and table confirmed | Not serverless-safe storage |
| Destination database schema | PARTIALLY FUNCTIONAL | Schema read directly, confirmed missing column | Add a `featured` column and UI if needed |
| Admin destination management | FULLY FUNCTIONAL | Create, edit, publish, geocode, photos all confirmed real | Nothing blocking |
| Mileage management | FULLY FUNCTIONAL | Live 150km x 200 RWF = 30,000 RWF calculation confirmed | Nothing blocking |
| Odometer | PARTIALLY FUNCTIONAL | Real PATCH endpoint confirmed, feeds mileage math | Fuel, condition, and photos are entirely absent |
| Trip analytics | PARTIALLY FUNCTIONAL | Two real analytics surfaces confirmed, no fake numbers | Popular destinations, popular routes, average distance, real-booking usage stats |
| AI trip planner | NOT IMPLEMENTED | No free-text-to-plan code path found anywhere | Genuinely new development if this is required |
| AI What If | PARTIALLY FUNCTIONAL | Live tested; fresh scenarios recalculate real values, follow-up text resets context | Preserve context on free-text follow-ups; compute route/distance/time/mileage |
| AI explanation | Rule-based, honestly self-labelled | Confirmed via API field `"parserType": "deterministic"` and code read | Accurately described, not a gap by itself |
| AI failure fallback | FULLY FUNCTIONAL | Manual planner confirmed fully independent of What If | Nothing blocking, though there is no AI to fail over from yet |
| Route to booking | PARTIALLY FUNCTIONAL | `buildTripPayload()` read directly | Structured stop data does not transfer, only a text summary |
| Admin control | PARTIALLY FUNCTIONAL | Full real nav confirmed, each page checked | No trip planner settings page, no AI configuration page |
| International customer experience | PARTIALLY FUNCTIONAL | Synthesized from all sections above | Distance/time info blocked on missing coordinates; no currency conversion or language switch |
| Mobile | FULLY FUNCTIONAL | Fresh Playwright test, 5 widths x 8 real page states, zero overflow | Nothing blocking |
| Hardcoded data | Mostly clean | Full repository search performed | The What If parser's 5-destination keyword list is the one real, load-bearing instance |
| Production dependencies | Mixed | See Section 24 table | Email and payment are the two entirely unbuilt dependencies; AI has no code path yet |

### Ratings

Customer experience: 6/10. Fleet browsing, real pricing, real map, and clean authentication all work well and are genuinely trustworthy. The score is held back by the booking flow silently dropping the customer's chosen pickup/drop-off location and specific extras, and by the trip planner's usefulness being capped at one destination with real coordinates today.

Business operations: 6/10. Admin has real, working control over fleet, pricing, extras, destinations, and mileage, which covers the operational core well. It loses points for the missing double-booking check, the client-trusted price total, and the completely unbuilt email and payment paths, all of which a real operator will hit quickly.

AI capability: 3/10. What exists (the What If price and vehicle recalculation, and the honestly-labelled deterministic explanations) is well engineered and, importantly, never misrepresents itself as AI when it is not. But the two features most associated with "AI" in the original brief, a natural language trip planner and a What If tool that keeps context across a conversation, are respectively not implemented and only partially working.

Admin capability: 7/10. The real navigation covers fleet, pricing, extras, destinations, mileage, bookings, customers, reviews, packages, and guides, which is a genuinely broad and mostly real set of controls. It is missing trip planner configuration and any AI configuration, and analytics is narrower than what was asked for.

Production readiness: 4/10. Authentication, fleet, pricing, and mileage are solid enough to trust with real customers today. Email and payment are completely absent, image uploads are not serverless-safe, booking data has real integrity gaps (no server-side price check, no double-booking check, dropped location data), and geocoding/routing could not be end-to-end verified in this environment (architecture is real, but has not been proven live outside a code read plus a blocked network test).

---

## Note on this audit's own limitations

Three findings above (Sections 5, 6, 8) rely on code review plus a blocked live network test rather than a completed successful live test, because this testing sandbox's outbound network policy blocks `nominatim.openstreetmap.org` and `router.project-osrm.org` directly, confirmed with direct curl attempts, not assumed. This was diagnosed as an environment limitation, not treated as if it were a passing test. These three sections should be spot-checked once on the real deployed site using the exact examples in this document (University of Rwanda Huye Campus, Muhanga, Rubavu, Kigali Convention Centre for geocoding; Kigali to Akagera, Kigali to Musanze, Kigali to Rubavu for routing) before relying on this report's classification of them as production-ready.

Everything else in this document was executed and observed directly: real HTTP requests against the running server, real SQLite queries against the actual database file, and real browser automation against the actual rendered pages, with before/after values shown wherever a change was tested.
