-- ---------------------------------------------------------------------------
-- ZEBRA MOTORS, DATABASE SCHEMA (Phase 3B)
-- ---------------------------------------------------------------------------
-- SQLite, applied automatically on first server start (see lib/db/client.js).
-- Written as plain relational SQL rather than through an ORM migration tool:
-- this sandbox's network policy blocks Prisma's engine download endpoint
-- (binaries.prisma.sh returned 403 Forbidden during setup), so the schema
-- is hand-written here and applied directly through better-sqlite3, which
-- is a pure native module with no external binary fetch at install or run
-- time. Every table below maps directly to a Postgres table, moving to
-- Postgres later is a driver swap in lib/db/client.js, not a schema rewrite:
-- the column types, keys, and defaults are ordinary ANSI SQL.
--
-- Scope for this pass: the tables needed to make Business Settings and
-- Fleet Management real and admin-editable, plus Review moderation, plus
-- the supporting tables (users, audit_log, vehicle_photos). Bookings,
-- customers, FAQ, packages, and guide articles are included as schema so
-- the data model is complete end to end, but do not yet have admin UI or
-- public wiring, they stay real, marked, static content in /data for now.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'STAFF', -- SUPER_ADMIN | ADMIN | MANAGER | STAFF
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Singleton row, id is always 'singleton'.
CREATE TABLE IF NOT EXISTS business_settings (
  id                   TEXT PRIMARY KEY DEFAULT 'singleton',
  company_name         TEXT NOT NULL DEFAULT 'Zebra Motors',
  legal_name           TEXT NOT NULL DEFAULT 'NOT YET CONFIRMED',
  phone                TEXT NOT NULL DEFAULT '+250 784 111 206',
  phone_display        TEXT NOT NULL DEFAULT '+250 784 111 206',
  -- Not listed anywhere on zebramotors.rw (checked directly, 2026-08-28), do
  -- not default this to the confirmed phone number, that would assert an
  -- unconfirmed fact. NULL until Zebra confirms a real WhatsApp number.
  whatsapp             TEXT,
  email                TEXT NOT NULL DEFAULT 'info@zebramotor.rw',
  address              TEXT NOT NULL DEFAULT 'Kigali, Rwanda',
  city                 TEXT NOT NULL DEFAULT 'Kigali',
  country              TEXT NOT NULL DEFAULT 'Rwanda',
  timezone             TEXT NOT NULL DEFAULT 'Africa/Kigali',
  default_currency     TEXT NOT NULL DEFAULT 'RWF',
  supported_currencies TEXT NOT NULL DEFAULT '["RWF"]',
  -- Admin-entered exchange rates (Section: currency conversion), one real
  -- number per currency code, meaning "1 unit of this currency = this many
  -- RWF" (the way a real person reads a rate: "1 USD = 1300 RWF"), e.g.
  -- '{"USD": 1300, "EUR": 1200}'. RWF itself is never a key here, it is the
  -- database's own unit, nothing to convert. A currency in
  -- supported_currencies with no rate here simply cannot be shown
  -- converted yet, see lib/currency.js, nothing is ever estimated from a
  -- missing rate.
  currency_rates       TEXT NOT NULL DEFAULT '{}',
  supported_languages  TEXT NOT NULL DEFAULT '["en"]',
  business_hours       TEXT NOT NULL DEFAULT 'NOT YET CONFIRMED',
  emergency_phone      TEXT NOT NULL DEFAULT 'NOT YET CONFIRMED',
  social_links         TEXT NOT NULL DEFAULT '{}',
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vehicles (
  id                 TEXT PRIMARY KEY,
  slug               TEXT UNIQUE NOT NULL,
  make               TEXT NOT NULL,
  model              TEXT NOT NULL,
  display_name       TEXT NOT NULL,
  year               INTEGER NOT NULL,
  category           TEXT NOT NULL,
  transmission       TEXT NOT NULL,
  fuel               TEXT NOT NULL,
  drive              TEXT NOT NULL DEFAULT '2WD',
  doors              INTEGER NOT NULL,
  seats              INTEGER NOT NULL,
  luggage            TEXT NOT NULL DEFAULT '',
  ac                 INTEGER NOT NULL DEFAULT 1,
  daily_rate_rwf_min INTEGER NOT NULL,
  daily_rate_rwf_max INTEGER NOT NULL,
  tags               TEXT NOT NULL DEFAULT '[]',
  badge              TEXT,
  description        TEXT NOT NULL DEFAULT '',
  short_description  TEXT,
  status             TEXT NOT NULL DEFAULT 'AVAILABLE', -- AVAILABLE|RESERVED|RENTED|MAINTENANCE|UNAVAILABLE|ARCHIVED
  featured           INTEGER NOT NULL DEFAULT 1,
  -- Mileage policy (P3). UNLIMITED means no allowance tracking at all,
  -- DAILY_ALLOWANCE compares actual trip distance against
  -- included_km_per_day * rental days, TOTAL_ALLOWANCE compares against a
  -- single included_total_km regardless of rental length. Every vehicle
  -- starts UNLIMITED with no numbers set, exactly the honest default until
  -- Zebra confirms a real policy for that vehicle, see lib/db/vehicles.js.
  mileage_policy_type TEXT NOT NULL DEFAULT 'UNLIMITED', -- UNLIMITED | DAILY_ALLOWANCE | TOTAL_ALLOWANCE
  included_km_per_day  INTEGER,
  included_total_km    INTEGER,
  extra_km_rate_rwf    INTEGER,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vehicle_photos (
  id         TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  alt_text   TEXT NOT NULL DEFAULT '',
  is_primary INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vehicle_availability (
  id         TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  start_date TEXT NOT NULL,
  end_date   TEXT NOT NULL,
  reason     TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- password_hash is nullable: a customer row can exist purely as a booking
-- contact (created by staff via /admin/bookings/new, or once the public
-- Booking Request flow writes real rows) with no login capability at all,
-- exactly as before. It only gets set when that same email signs up for a
-- real account (Section 7/8 of the presentation-readiness pass, customer
-- authentication Option A). Signing up with an email that already has a
-- customer row (e.g. a booking Zebra staff entered by phone) claims that
-- existing row rather than creating a duplicate, see
-- lib/db/customers.js createCustomerAccount().
CREATE TABLE IF NOT EXISTS customers (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  phone         TEXT,
  country       TEXT,
  password_hash TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bookings (
  id             TEXT PRIMARY KEY,
  booking_number TEXT UNIQUE NOT NULL,
  vehicle_id     TEXT NOT NULL REFERENCES vehicles(id),
  customer_id    TEXT REFERENCES customers(id),
  pickup_date    TEXT NOT NULL,
  return_date    TEXT NOT NULL,
  service_type   TEXT NOT NULL DEFAULT 'self-drive',
  status         TEXT NOT NULL DEFAULT 'PENDING',
  -- 'online_request' when a real customer submitted this through the
  -- public /book flow (Section 10, Booking Request MVP), 'staff_entered'
  -- when Zebra staff recorded it directly via /admin/bookings/new. Lets
  -- the admin bookings list distinguish "needs your review" from "you
  -- already confirmed this by phone", see lib/db/bookings.js createBooking().
  source         TEXT NOT NULL DEFAULT 'staff_entered',
  -- Real pickup/drop-off text the customer (or staff) entered. Collected in
  -- the booking form since the beginning, but previously dropped before the
  -- network request, see lib/db/bookings.js createBooking() for where this
  -- is now actually saved.
  pickup_location  TEXT,
  dropoff_location TEXT,
  total_rwf      INTEGER NOT NULL,
  deposit_rwf    INTEGER,
  is_demo        INTEGER NOT NULL DEFAULT 1,
  -- Real trip usage (P3), recorded by staff at vehicle handover and return,
  -- never estimated. planned_distance_km is filled in only when it came
  -- from a real routed trip (see route_cache below), otherwise it stays
  -- null rather than guessed. See lib/db/bookings.js getMileageUsage().
  pickup_odometer_km  INTEGER,
  return_odometer_km  INTEGER,
  planned_distance_km INTEGER,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Which real, admin-priced extras (rental_extras) a customer actually
-- selected on a given booking, snapshotted at booking time (name, pricing
-- type, and price copied in, not just a foreign key) so a later admin price
-- change never silently rewrites what a past customer was actually charged.
-- Previously this information was computed into the on-screen total and
-- then discarded, never reaching the database, see FINAL_FEATURE_AUDIT.md
-- Section 3.
CREATE TABLE IF NOT EXISTS booking_extras (
  id           TEXT PRIMARY KEY,
  booking_id   TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  extra_key    TEXT NOT NULL,
  name         TEXT NOT NULL,
  pricing_type TEXT NOT NULL,
  price_rwf    INTEGER,
  amount_rwf   INTEGER,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_booking_extras_booking_id ON booking_extras(booking_id);

CREATE TABLE IF NOT EXISTS reviews (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  stars      INTEGER NOT NULL,
  text       TEXT NOT NULL,
  source     TEXT NOT NULL DEFAULT 'zebramotors.rw',
  country    TEXT,
  verified   INTEGER NOT NULL DEFAULT 0,
  published  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS faqs (
  id         TEXT PRIMARY KEY,
  question   TEXT NOT NULL,
  answer     TEXT NOT NULL,
  category   TEXT NOT NULL DEFAULT 'general',
  published  INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS packages (
  id         TEXT PRIMARY KEY,
  slug       TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  duration   TEXT NOT NULL,
  summary    TEXT NOT NULL,
  includes   TEXT NOT NULL DEFAULT '[]',
  best_for   TEXT NOT NULL DEFAULT '[]',
  published  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS guide_articles (
  id           TEXT PRIMARY KEY,
  slug         TEXT UNIQUE NOT NULL,
  title        TEXT NOT NULL,
  excerpt      TEXT NOT NULL,
  content      TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT 'general',
  status       TEXT NOT NULL DEFAULT 'published',
  published_at TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id),
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  detail      TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- First-party page view log (Section 3G). No third-party analytics
-- provider, no cookies, no visitor identifiers of any kind, just a count
-- of which real pages and vehicles get looked at, recorded server-side.
-- This is what "analytics" honestly means without an analytics provider
-- account or tracking ID, which nobody has supplied (Rule 2).
CREATE TABLE IF NOT EXISTS page_views (
  id         TEXT PRIMARY KEY,
  path       TEXT NOT NULL,
  vehicle_id TEXT REFERENCES vehicles(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(path);

-- What If sessions (Zebra AI What If, customer-facing scenario exploration).
-- Records the real text a visitor typed, the structured scenario the
-- deterministic parser extracted from it, and which vehicle (if any) came
-- out as the best match, so the admin What If analytics view can show real
-- usage instead of invented numbers. No account or visitor identifier is
-- stored, consistent with page_views above.
CREATE TABLE IF NOT EXISTS what_if_sessions (
  id                   TEXT PRIMARY KEY,
  raw_input            TEXT NOT NULL DEFAULT '',
  scenario_json        TEXT NOT NULL DEFAULT '{}',
  recommended_vehicle_id TEXT REFERENCES vehicles(id),
  clicked_continue     INTEGER NOT NULL DEFAULT 0,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_what_if_sessions_created_at ON what_if_sessions(created_at);

-- Leads (real prospective-customer records, business data foundation pass).
-- A lead is created from a real, real-world signal, currently only the
-- public contact form, never generated or guessed. status moves
-- NEW -> CONTACTED -> CONVERTED (linked to a real customers row via
-- converted_customer_id) or LOST. This is the top of Zebra's real customer
-- pipeline, distinct from the customers table, which today is only
-- populated once a real booking exists (Phase 3D).
CREATE TABLE IF NOT EXISTS leads (
  id                     TEXT PRIMARY KEY,
  name                   TEXT NOT NULL,
  email                  TEXT NOT NULL,
  phone                  TEXT,
  message                TEXT NOT NULL DEFAULT '',
  source                 TEXT NOT NULL DEFAULT 'contact_form',
  status                 TEXT NOT NULL DEFAULT 'NEW', -- NEW | CONTACTED | CONVERTED | LOST
  vehicle_id             TEXT REFERENCES vehicles(id),
  converted_customer_id  TEXT REFERENCES customers(id),
  admin_notes            TEXT NOT NULL DEFAULT '',
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- Vehicle maintenance log (business data foundation pass). Real service and
-- repair history per vehicle, entered by staff, nothing here is scheduled
-- or estimated automatically. When a record moves to IN_PROGRESS the
-- vehicle's own status is set to MAINTENANCE, and reverted to AVAILABLE
-- when the last open record on that vehicle is closed, see
-- lib/db/maintenance.js for exactly what triggers that.
CREATE TABLE IF NOT EXISTS vehicle_maintenance (
  id              TEXT PRIMARY KEY,
  vehicle_id      TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  type            TEXT NOT NULL DEFAULT 'service', -- service | repair | inspection | other
  description     TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'SCHEDULED', -- SCHEDULED | IN_PROGRESS | DONE | CANCELLED
  scheduled_date  TEXT,
  completed_date  TEXT,
  cost_rwf        INTEGER,
  odometer_km     INTEGER,
  notes           TEXT NOT NULL DEFAULT '',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle ON vehicle_maintenance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON vehicle_maintenance(status);

-- Rental extras (real, admin-controlled optional services). The booking
-- flow used to show "Airport delivery, estimated RWF 15,000" and "GPS,
-- estimated RWF 3,000/day" as fixed numbers nobody at Zebra had actually
-- confirmed, that was a fabricated price and has been removed. Every row
-- here starts inactive with no price, exactly the honest state until
-- Zebra management confirms a real one, see lib/db/extras.js. The public
-- booking flow only ever shows an extra when active = 1 AND (price_rwf is
-- set OR pricing_type = 'CUSTOM_QUOTE').
CREATE TABLE IF NOT EXISTS rental_extras (
  id           TEXT PRIMARY KEY,
  key          TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  pricing_type TEXT NOT NULL DEFAULT 'PER_BOOKING', -- PER_DAY | PER_BOOKING | PER_KM | CUSTOM_QUOTE
  price_rwf    INTEGER,
  active       INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- DESTINATIONS (P1 of the trip planner spec). Real, admin-managed places a
-- trip can stop at, replacing the hardcoded 5-name list that used to live in
-- components/TripPlanner.js. Nothing here is invented, a destination starts
-- unpublished with no photo until an admin fills it in, exactly like a new
-- vehicle. category is a plain TEXT column holding one of the
-- DestinationCategory values, checked in application code (lib/db/destinations.js)
-- rather than a SQLite CHECK constraint, so a future admin-managed category
-- list does not require a schema migration.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS destinations (
  id                          TEXT PRIMARY KEY,
  slug                        TEXT UNIQUE NOT NULL,
  name                        TEXT NOT NULL,
  description                 TEXT NOT NULL DEFAULT '',
  lat                         REAL,
  lng                         REAL,
  region                      TEXT NOT NULL DEFAULT '',
  category                    TEXT NOT NULL DEFAULT 'CUSTOM', -- CITY | NATIONAL_PARK | LAKE | MOUNTAIN | AIRPORT | HOTEL | ATTRACTION | CUSTOM
  recommended_vehicle_category TEXT,
  notes                       TEXT NOT NULL DEFAULT '',
  published                   INTEGER NOT NULL DEFAULT 0,
  created_at                  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Real admin-uploaded photos only, the same pattern as vehicle_photos, so a
-- destination with no upload yet shows the same grey placeholder a vehicle
-- does rather than a stock or generated image (Rule 5). is_primary is what
-- the public site treats as the destination's "hero image".
CREATE TABLE IF NOT EXISTS destination_photos (
  id             TEXT PRIMARY KEY,
  destination_id TEXT NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  url            TEXT NOT NULL,
  alt_text       TEXT NOT NULL DEFAULT '',
  is_primary     INTEGER NOT NULL DEFAULT 0,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- A customer typing a place that is not in the real catalogue above (the
-- trip planner allows this, see components/TripPlanner.js) is a real signal
-- of demand worth Zebra seeing, but it must never silently become a public
-- destination on its own, that would let a site visitor publish content.
-- This table only ever grows from real customer input and is only ever
-- read by an admin deciding whether to add a real destinations row.
CREATE TABLE IF NOT EXISTS custom_destination_requests (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  notes      TEXT NOT NULL DEFAULT '',
  source     TEXT NOT NULL DEFAULT 'trip_planner',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_destination_photos_destination_id ON destination_photos(destination_id);

-- Real popularity signal (P3): incremented whenever a customer adds a real
-- published destination to a trip in the planner. This is an actual count
-- of a real event, not an estimate, see lib/db/destinations.js
-- recordDestinationSelection().
CREATE TABLE IF NOT EXISTS destination_selections (
  id             TEXT PRIMARY KEY,
  destination_id TEXT NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_destination_selections_destination_id ON destination_selections(destination_id);

-- ---------------------------------------------------------------------------
-- ROUTING AND GEOCODING CACHE (P2). Real distance and drive time only ever
-- come from an actual routing API call, this table exists purely to avoid
-- calling the free public OSRM demo router and Nominatim geocoder more than
-- necessary, both have strict fair-use rate limits and no uptime guarantee,
-- see lib/geo/provider.js for the full disclosure. A cache miss always
-- falls through to a real API call or an honest "not available" state,
-- nothing here is ever invented to fill a gap.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS geocode_cache (
  id           TEXT PRIMARY KEY,
  query        TEXT UNIQUE NOT NULL,
  lat          REAL NOT NULL,
  lng          REAL NOT NULL,
  display_name TEXT,
  provider     TEXT NOT NULL DEFAULT 'nominatim',
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS route_cache (
  id               TEXT PRIMARY KEY,
  cache_key        TEXT UNIQUE NOT NULL,
  distance_km      REAL NOT NULL,
  duration_minutes REAL NOT NULL,
  geometry         TEXT, -- JSON array of [lat,lng] points for drawing the route line
  legs             TEXT, -- JSON array of {distanceKm, durationMinutes} per consecutive stop pair
  provider         TEXT NOT NULL DEFAULT 'osrm-demo',
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- ZEBRA AI: knowledge base, support conversations, interaction log.
-- ---------------------------------------------------------------------------
-- Every article here is written and published by a real admin through
-- /admin/knowledge. The AI Support retrieval layer only ever surfaces what
-- already exists in this table, it never invents Zebra policy text (Rule
-- 2). This table starts empty on a fresh database; until real Zebra policy
-- content is published here, AI Support and the What If explainer fall back
-- to an honest "I can't confirm that, let me connect you with the team"
-- for anything outside what the deterministic tools already compute.
CREATE TABLE IF NOT EXISTS knowledge_articles (
  id         TEXT PRIMARY KEY,
  category   TEXT NOT NULL DEFAULT 'FAQ', -- FLEET | POLICIES | INSURANCE | AIRPORT_PICKUP | RENTAL_REQUIREMENTS | DRIVING_IN_RWANDA | DESTINATIONS | FAQ | CANCELLATION | MILEAGE | CHAUFFEUR | TERMS
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  published  INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_category ON knowledge_articles(category);

-- One row per customer support issue, whether it stays fully AI-handled or
-- is escalated to a real Zebra staff member. customer_id and booking_id are
-- nullable, a visitor can start a conversation before signing in or before
-- any booking exists. Once assigned_agent_id is set, the AI must stop
-- auto-responding in this conversation (enforced in the API route, not just
-- the UI), see lib/ai/support.js.
CREATE TABLE IF NOT EXISTS support_conversations (
  id                TEXT PRIMARY KEY,
  customer_id       TEXT REFERENCES customers(id),
  booking_id        TEXT REFERENCES bookings(id),
  status            TEXT NOT NULL DEFAULT 'OPEN', -- OPEN | AI_HANDLING | WAITING_FOR_CUSTOMER | WAITING_FOR_ZEBRA | ESCALATED | RESOLVED | CLOSED
  priority          TEXT NOT NULL DEFAULT 'NORMAL', -- NORMAL | HIGH
  assigned_agent_id TEXT REFERENCES users(id),
  ai_summary        TEXT NOT NULL DEFAULT '',
  escalation_reason TEXT,
  access_token_hash TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_support_conversations_status ON support_conversations(status);

CREATE TABLE IF NOT EXISTS support_messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  sender_type     TEXT NOT NULL, -- CUSTOMER | AI | AGENT | SYSTEM
  content         TEXT NOT NULL DEFAULT '',
  metadata_json   TEXT NOT NULL DEFAULT '{}',
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_support_messages_conversation ON support_messages(conversation_id);

-- Auditability (AI architecture spec, item 22): one row per AI turn, enough
-- to answer "what did the AI do and why" without duplicating raw message
-- content, which already lives in support_messages.
CREATE TABLE IF NOT EXISTS ai_interaction_log (
  id                     TEXT PRIMARY KEY,
  conversation_id        TEXT REFERENCES support_conversations(id),
  provider               TEXT NOT NULL DEFAULT 'none', -- none | openai | anthropic
  model                  TEXT NOT NULL DEFAULT '',
  tools_called_json      TEXT NOT NULL DEFAULT '[]',
  knowledge_sources_json TEXT NOT NULL DEFAULT '[]',
  escalated              INTEGER NOT NULL DEFAULT 0,
  escalation_reason      TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now'))
);
