// ---------------------------------------------------------------------------
// INCREMENTAL MIGRATIONS
// ---------------------------------------------------------------------------
// prisma/schema.sql and prisma/schema.postgres.sql use CREATE TABLE IF NOT
// EXISTS, which is enough for a brand new database but does nothing for a
// database that already exists from before a column was added (a local
// dev.db someone has been running for a while, or a Netlify/Vercel /tmp
// SQLite file that happens to survive between requests on a still-warm
// instance). This file is the small, additive fix for that: a short list of
// ALTER TABLE statements, each applied once and safely skipped if it was
// already applied before.
//
// Every entry here should be a pure ADD COLUMN (or similarly additive,
// non-destructive) change, never a rename or drop, since this runs
// automatically against whatever database is live, with no confirmation
// step. Add new entries to the end of the list, never edit or remove an
// existing one, that history is what makes an already-migrated database
// safe to keep booting.
// ---------------------------------------------------------------------------

const MIGRATIONS = [
  {
    id: "2026-09-customers-password-hash",
    sql: "ALTER TABLE customers ADD COLUMN password_hash TEXT",
  },
  {
    id: "2026-09-bookings-source",
    sql: "ALTER TABLE bookings ADD COLUMN source TEXT NOT NULL DEFAULT 'staff_entered'",
  },
  {
    id: "2026-09-bookings-pickup-location",
    sql: "ALTER TABLE bookings ADD COLUMN pickup_location TEXT",
  },
  {
    id: "2026-09-bookings-dropoff-location",
    sql: "ALTER TABLE bookings ADD COLUMN dropoff_location TEXT",
  },
  {
    id: "2026-09-support-anonymous-access-token",
    sql: "ALTER TABLE support_conversations ADD COLUMN access_token_hash TEXT",
  },
  {
    id: "2026-09-business-settings-currency-rates",
    sql: "ALTER TABLE business_settings ADD COLUMN currency_rates TEXT NOT NULL DEFAULT '{}'",
  },
];

// SQLite has no "ADD COLUMN IF NOT EXISTS", it just throws "duplicate
// column name" if the column is already there. Postgres's error differs
// slightly ("column ... already exists"). Both are the expected, harmless
// outcome on a database that already has the column, so both are the only
// errors this deliberately swallows, anything else is a real problem and
// is rethrown.
function isAlreadyAppliedError(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("duplicate column") || message.includes("already exists");
}

export async function applyMigrations(adapter) {
  for (const migration of MIGRATIONS) {
    try {
      await adapter.exec(migration.sql);
    } catch (error) {
      if (!isAlreadyAppliedError(error)) {
        throw new Error(`Migration "${migration.id}" failed: ${error.message}`);
      }
    }
  }
}
