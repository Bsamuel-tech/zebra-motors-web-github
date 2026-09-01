// ---------------------------------------------------------------------------
// DUAL-DRIVER SQL ADAPTER (Postgres migration, Section 2/3 of the
// presentation-readiness pass)
// ---------------------------------------------------------------------------
// Every module in lib/db/*.js talks to the database through exactly one
// shape: `const db = await getDb()` then `await db.prepare(sql).all(...)`,
// `.get(...)`, or `.run(...)`, the same chain this codebase has always used
// (originally better-sqlite3, then node:sqlite), just awaited. That means
// none of the business-logic modules (vehicles.js, bookings.js, settings.js,
// and so on) need to know or care which real database is underneath, they
// call the same three methods either way. This file is the only place that
// knows about node:sqlite or Postgres.
//
// Which driver is used is decided once, in lib/db/client.js, based on
// whether DATABASE_URL is set:
//   - Not set (local dev, or a deploy with no Postgres configured yet):
//     SqliteAdapter wraps node:sqlite exactly as before.
//   - Set to a real Postgres connection string: PostgresAdapter wraps a
//     `pg` connection pool.
//
// This only works because every query written in lib/db/*.js is
// deliberately ANSI-portable SQL: "?" positional placeholders (translated
// to Postgres's $1, $2, ... below), no SQLite-only functions in the actual
// query text (datetime('now') only ever appears as a schema DEFAULT, never
// inside application code, since every insert passes its own nowIso()
// value), and the one UPSERT pattern used (lib/db/geoCache.js) is written
// as `ON CONFLICT (col) DO UPDATE SET x = excluded.x`, which is valid,
// identical syntax in both SQLite and Postgres. Booleans are stored as
// INTEGER 0/1 and JSON as TEXT in both databases (the app layer does
// JSON.parse/JSON.stringify itself), so no column type needs to differ
// between the two schema files either. See prisma/schema.sql (SQLite) and
// prisma/schema.postgres.sql (Postgres, same tables, same columns).
// ---------------------------------------------------------------------------

// Turns "SELECT * FROM x WHERE a = ? AND b = ?" into
// "SELECT * FROM x WHERE a = $1 AND b = $2". Good enough for every query in
// this codebase because none of them embed a literal "?" character inside a
// string constant, they are all plain column/parameter placeholders.
function translatePlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

export class SqliteAdapter {
  constructor(nativeDb) {
    this.native = nativeDb;
    this.kind = "sqlite";
  }

  prepare(sql) {
    const stmt = this.native.prepare(sql);
    return {
      all: async (...args) => stmt.all(...args),
      get: async (...args) => {
        const row = stmt.get(...args);
        return row === undefined ? undefined : row;
      },
      run: async (...args) => stmt.run(...args),
    };
  }

  async exec(sql) {
    this.native.exec(sql);
  }
}

export class PostgresAdapter {
  constructor(pool) {
    this.pool = pool;
    this.kind = "postgres";
  }

  prepare(sql) {
    const text = translatePlaceholders(sql);
    return {
      all: async (...args) => {
        const result = await this.pool.query(text, args);
        return result.rows;
      },
      get: async (...args) => {
        const result = await this.pool.query(text, args);
        return result.rows[0];
      },
      run: async (...args) => {
        await this.pool.query(text, args);
        return {};
      },
    };
  }

  // node-postgres runs a parameter-less query string through the simple
  // query protocol, which (like node:sqlite's exec) allows multiple
  // semicolon-separated statements in one call, so the whole schema file
  // can be applied the same way it is for SQLite.
  async exec(sql) {
    await this.pool.query(sql);
  }
}
