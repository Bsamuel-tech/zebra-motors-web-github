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

CREATE TABLE IF NOT EXISTS customers (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT UNIQUE NOT NULL,
  phone      TEXT,
  country    TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
  total_rwf      INTEGER NOT NULL,
  deposit_rwf    INTEGER,
  is_demo        INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

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
