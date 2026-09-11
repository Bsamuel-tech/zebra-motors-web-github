// ---------------------------------------------------------------------------
// DATABASE CLIENT (Phase 3B backend foundation, Postgres migration pass)
// ---------------------------------------------------------------------------
// Server-only. Never import this file from a "use client" component or from
// middleware.js, node:sqlite is only available in the Node.js runtime, not
// the browser or the Edge runtime.
//
// getDb() returns a Promise for one of two adapters (lib/db/adapter.js),
// decided once, the first time it is called:
//
//   - DATABASE_URL is set to a real Postgres connection string: every query
//     goes to that Postgres database via PostgresAdapter. This is what real
//     production use needs, see below.
//   - DATABASE_URL is not set: SqliteAdapter wraps node:sqlite exactly as
//     this file always has. This is local dev, and any deploy that has not
//     yet been given a Postgres database.
//
// No other file in lib/db/ knows or cares which of the two is active, they
// all call the same `await db.prepare(sql).all()/.get()/.run()` shape.
//
// Why node:sqlite for the SQLite path instead of Prisma or better-sqlite3:
// this sandbox's network policy blocks Prisma's engine download endpoint
// (binaries.prisma.sh returned 403 Forbidden during setup), and
// better-sqlite3 is a native module that needs compiling on install (Visual
// Studio C++ build tools on Windows), which is not something every machine
// running this project will have set up. node:sqlite is built into Node.js
// itself (stable in recent Node 22 and 24 releases), no separate package, no
// compiling. It does print an "experimental feature" warning to the
// console, that is expected and harmless.
//
// SERVERLESS FILESYSTEMS (Netlify, Vercel, and any other AWS Lambda-based
// function host), why this matters even with Postgres configured: the
// deployed code directory is read-only at runtime, only /tmp is writable,
// and prisma/dev.db is gitignored so it never even exists in the deployed
// bundle. Without DATABASE_URL set, this file opens SQLite at /tmp instead
// and self-seeds it with the real confirmed data (lib/db/seedData.js) so
// the public site has real content instead of erroring, exactly as before.
// But /tmp on a serverless function only persists for the lifetime of one
// warm instance, is not shared between concurrent instances, and is wiped
// on every cold start. That means with no DATABASE_URL, public read-mostly
// pages (fleet, reviews, FAQ, packages, guides) work correctly, but
// anything written through the admin panel (bookings, settings edits,
// vehicle photo uploads, odometer entries) is not reliably persistent.
// Real production use of the admin panel and the booking flow needs
// DATABASE_URL pointed at a real Postgres database (Neon, Vercel Postgres,
// Supabase, or any standard Postgres host), which removes this limitation
// entirely, once DATABASE_URL is set, every write goes to that database,
// not to /tmp, and survives cold starts and concurrent function instances
// exactly like any normal web application's database.
// ---------------------------------------------------------------------------

import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";
import { seedDatabase, ensureAdminUser, backfillDestinationCoordinates } from "./seedData";
import { SqliteAdapter, PostgresAdapter } from "./adapter";
import { applyMigrations } from "./migrations";

const IS_SERVERLESS = Boolean(
  process.env.NETLIFY ||
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT
);

const DB_PATH = IS_SERVERLESS
  ? path.join("/tmp", "zebra-motors-dev.db")
  : path.join(process.cwd(), "prisma", "dev.db");
const SCHEMA_PATH_SQLITE = path.join(process.cwd(), "prisma", "schema.sql");
const SCHEMA_PATH_POSTGRES = path.join(process.cwd(), "prisma", "schema.postgres.sql");

// .env in this repo has carried a DATABASE_URL="file:./dev.db" value since
// an earlier, abandoned attempt to use Prisma (see lib/db/client.js's
// original comment history and lib/db/seedData.js). That is a Prisma-style
// SQLite URL, not a Postgres connection string, and was never actually read
// by any code until this migration. Treating any truthy DATABASE_URL as
// "use Postgres" would make this file try to open a Postgres connection
// using that leftover value and fail outright (confirmed: it throws
// ECONNREFUSED against 127.0.0.1:5432, Postgres's default port, since
// "file:./dev.db" is obviously not a reachable Postgres host). So this only
// takes the Postgres path when DATABASE_URL actually looks like one
// (postgres:// or postgresql://), and otherwise falls back to SQLite
// exactly as if DATABASE_URL were not set at all. Once a real Postgres
// connection string is set, replace the old file:./dev.db value with it,
// they serve the same env var name but are not compatible with each other.
function isRealPostgresUrl(value) {
  return typeof value === "string" && /^postgres(ql)?:\/\//i.test(value.trim());
}

// Most managed Postgres providers (Neon, Vercel Postgres, Supabase, Render)
// terminate TLS with a certificate that isn't in Node's default trust store
// in every environment, and all of them require TLS in the first place.
// rejectUnauthorized: false still encrypts the connection, it only skips
// verifying the certificate chain, the same trade-off these providers'
// own connection examples use for exactly this reason. A self-hosted
// Postgres reachable without TLS (e.g. on localhost) is unaffected, ssl
// stays unset there.
function sslConfigFor(connectionString) {
  const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
  if (isLocal) return undefined;
  return { rejectUnauthorized: false };
}

let _adapterPromise;

// Returns a Promise for the shared adapter, created on first call and
// reused after that (a module-level singleton, same lifetime as the old
// _db singleton this replaces). Every lib/db/*.js function does
// `const db = await getDb()` before its first query.
export function getDb() {
  if (_adapterPromise) return _adapterPromise;
  _adapterPromise = initDb();
  return _adapterPromise;
}

async function initDb() {
  let adapter;

  if (isRealPostgresUrl(process.env.DATABASE_URL)) {
    // Dynamic import so the `pg` module (and its TCP/TLS code paths) is
    // never touched at all when running on SQLite, keeping the local dev
    // and no-Postgres-configured-yet paths exactly as before.
    const { Pool } = await import("pg");
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslConfigFor(process.env.DATABASE_URL),
    });
    adapter = new PostgresAdapter(pool);
    const schema = fs.readFileSync(SCHEMA_PATH_POSTGRES, "utf8");
    await adapter.exec(schema);
  } else {
    const native = new DatabaseSync(DB_PATH);
    native.exec("PRAGMA journal_mode = WAL");
    native.exec("PRAGMA foreign_keys = ON");
    adapter = new SqliteAdapter(native);
    const schema = fs.readFileSync(SCHEMA_PATH_SQLITE, "utf8");
    await adapter.exec(schema);
  }

  await applyMigrations(adapter);

  const countRow = await adapter.prepare("SELECT COUNT(*) as c FROM vehicles").get();
  if (Number(countRow.c) === 0) {
    await seedDatabase(adapter, process.env);
  } else {
    // The rest of seedDatabase() only runs once, the first time the
    // database is empty. Admin bootstrap runs on every single startup
    // instead (idempotent, one cheap SELECT), so setting ADMIN_EMAIL and
    // ADMIN_PASSWORD for the first time on an already-running production
    // database is always enough to get a working admin login, with no
    // manual seed step. See lib/db/seedData.js's ensureAdminUser().
    await ensureAdminUser(adapter, process.env);
  }
  // Also every single startup, same reasoning: a database that already
  // existed before real destination coordinates were added here would
  // otherwise sit with lat/lng permanently null forever, since
  // seedDatabase()'s destinations block only ever runs once. This only
  // fills a genuinely empty coordinate, see backfillDestinationCoordinates().
  await backfillDestinationCoordinates(adapter);
  return adapter;
}

export function newId() {
  return crypto.randomUUID();
}

export function nowIso() {
  return new Date().toISOString();
}
