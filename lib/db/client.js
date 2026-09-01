// ---------------------------------------------------------------------------
// DATABASE CLIENT (Phase 3B backend foundation)
// ---------------------------------------------------------------------------
// Server-only. Never import this file from a "use client" component or from
// middleware.js, node:sqlite is only available in the Node.js runtime, not
// the browser or the Edge runtime.
//
// Why node:sqlite instead of Prisma: this sandbox's network policy blocks
// Prisma's engine download endpoint (binaries.prisma.sh returned 403
// Forbidden during setup).
//
// This originally used better-sqlite3 instead, which worked in this sandbox,
// but better-sqlite3 is a native module that needs compiling on install, and
// that requires the Visual Studio C++ build tools on Windows, which is not
// something every machine running this project will have set up. node:sqlite
// is built into Node.js itself (stable in recent Node 22 and 24 releases, no
// separate package, no compiling, no Visual Studio needed), and its
// DatabaseSync API is close enough to better-sqlite3's that no other file in
// lib/db/ needed to change, only this one. It does print an "experimental
// feature" warning to the console, that is expected and harmless.
//
// The schema (prisma/schema.sql) is ordinary relational SQL with no
// SQLite-specific tricks, so moving to a managed Postgres later means
// swapping this file for a `pg` connection pool and adjusting the few
// SQLite-only syntax spots (INTEGER 0/1 for booleans, TEXT for timestamps),
// not redesigning the data model.
//
// SERVERLESS HOSTS (Netlify, Vercel, and any other AWS Lambda-based function
// host): the deployed code directory is read-only at runtime, only /tmp is
// writable, and prisma/dev.db is gitignored so it never even exists in the
// deployed bundle in the first place. Writing to process.cwd()/prisma/dev.db
// there fails outright. When a serverless environment is detected, this
// file instead opens the database at /tmp, and self-seeds it with the real
// confirmed data (lib/db/seedData.js) the first time it is empty, so the
// public site actually has real content instead of erroring.
//
// Vercel specifically: this still does not make real admin writes
// (bookings, mileage/odometer entries, vehicle edits, photo uploads)
// reliably persistent, for the same reason as Netlify below, Vercel's
// serverless functions get a fresh /tmp per cold start and do not share it
// across concurrent instances either. The public marketing pages will work
// correctly (they only read the self-seeded data), but anything written
// through the admin panel can silently disappear on the next cold start.
// Real production use of the admin panel needs either a real persistent
// disk (a small VPS, Render, Railway, Fly.io) or swapping this file for a
// hosted database (Vercel Postgres, Neon, Turso, etc.), not a filesystem
// workaround.
//
// Read this honestly, though: /tmp on a serverless function is only
// guaranteed to persist for the lifetime of one warm instance, not across a
// cold start, and not shared between multiple concurrent instances. That
// means the public, read-mostly pages (fleet, reviews, FAQ, packages,
// guides) work correctly, but admin writes (bookings, settings edits,
// vehicle photo uploads) are not reliably persistent there. Real production
// use of the admin panel needs a host with a real persistent disk (a small
// VPS, Render, Railway, Fly.io) or a swap to a hosted database, not Netlify.
// ---------------------------------------------------------------------------

import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";
import { seedDatabase } from "./seedData";

const IS_SERVERLESS = Boolean(
  process.env.NETLIFY ||
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT
);

const DB_PATH = IS_SERVERLESS
  ? path.join("/tmp", "zebra-motors-dev.db")
  : path.join(process.cwd(), "prisma", "dev.db");
const SCHEMA_PATH = path.join(process.cwd(), "prisma", "schema.sql");

let _db;

export function getDb() {
  if (_db) return _db;
  _db = new DatabaseSync(DB_PATH);
  _db.exec("PRAGMA journal_mode = WAL");
  _db.exec("PRAGMA foreign_keys = ON");
  const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
  _db.exec(schema);
  const { c } = _db.prepare("SELECT COUNT(*) as c FROM vehicles").get();
  if (c === 0) {
    seedDatabase(_db, process.env);
  }
  return _db;
}

export function newId() {
  return crypto.randomUUID();
}

export function nowIso() {
  return new Date().toISOString();
}
