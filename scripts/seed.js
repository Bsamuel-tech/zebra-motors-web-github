// ---------------------------------------------------------------------------
// DATABASE SEED (Phase 3B)
// ---------------------------------------------------------------------------
// Run with: npm run db:seed
//
// This is now a thin CLI wrapper around lib/db/seedData.js's seedDatabase(),
// the same function that lib/db/client.js calls automatically the first
// time it opens an empty database (see that file's comment on why, mainly
// for serverless hosts). Keeping this script around is still useful for
// local development (seed explicitly, on your own schedule) and CI.
//
// Safe to re-run: it skips anything that already exists instead of
// duplicating rows.
// ---------------------------------------------------------------------------

const path = require("path");
const fs = require("fs");
const { DatabaseSync } = require("node:sqlite");

// Minimal .env loader, this script runs standalone via `node`, outside
// Next.js's own automatic .env loading.
function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnv();

const DB_PATH = path.join(__dirname, "..", "prisma", "dev.db");
const SCHEMA_PATH = path.join(__dirname, "..", "prisma", "schema.sql");

async function main() {
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(fs.readFileSync(SCHEMA_PATH, "utf8"));

  const before = {
    settings: db.prepare("SELECT COUNT(*) as c FROM business_settings").get().c,
    vehicles: db.prepare("SELECT COUNT(*) as c FROM vehicles").get().c,
    reviews: db.prepare("SELECT COUNT(*) as c FROM reviews").get().c,
    faqs: db.prepare("SELECT COUNT(*) as c FROM faqs").get().c,
    packages: db.prepare("SELECT COUNT(*) as c FROM packages").get().c,
    articles: db.prepare("SELECT COUNT(*) as c FROM guide_articles").get().c,
    users: db.prepare("SELECT COUNT(*) as c FROM users").get().c,
  };

  // lib/db/seedData.js is an ES module (consistent with the rest of lib/db,
  // which Next.js's own bundler transpiles); this plain CommonJS script
  // loads it with a dynamic import() instead, the standard way to bridge
  // the two module systems in Node. seedDatabase() now expects the same
  // async prepare().all()/.get()/.run() adapter shape lib/db/client.js
  // uses (see lib/db/adapter.js), not a raw node:sqlite DatabaseSync, so
  // this script's own db handle is wrapped the same way before being
  // passed in. The plain synchronous db.prepare(...).get() calls above and
  // below (the before/after counts) are unaffected, they talk to
  // node:sqlite directly and were never going through seedDatabase().
  const { seedDatabase } = await import("../lib/db/seedData.js");
  const { SqliteAdapter } = await import("../lib/db/adapter.js");
  await seedDatabase(new SqliteAdapter(db), process.env);

  const after = {
    settings: db.prepare("SELECT COUNT(*) as c FROM business_settings").get().c,
    vehicles: db.prepare("SELECT COUNT(*) as c FROM vehicles").get().c,
    reviews: db.prepare("SELECT COUNT(*) as c FROM reviews").get().c,
    faqs: db.prepare("SELECT COUNT(*) as c FROM faqs").get().c,
    packages: db.prepare("SELECT COUNT(*) as c FROM packages").get().c,
    articles: db.prepare("SELECT COUNT(*) as c FROM guide_articles").get().c,
    users: db.prepare("SELECT COUNT(*) as c FROM users").get().c,
  };

  console.log(after.settings > before.settings ? "Seeded business_settings." : "business_settings already present, skipped.");
  console.log(`Vehicles: ${after.vehicles} present${after.vehicles > before.vehicles ? " (seeded)" : ""}.`);
  console.log(after.reviews > before.reviews ? `Seeded ${after.reviews} reviews.` : "Reviews already present, skipped.");
  console.log(after.faqs > before.faqs ? `Seeded ${after.faqs} FAQ entries.` : "faqs already present, skipped.");
  console.log(after.packages > before.packages ? `Seeded ${after.packages} packages.` : "packages already present, skipped.");
  console.log(after.articles > before.articles ? `Seeded ${after.articles} guide articles.` : "guide_articles already present, skipped.");
  if (after.users > before.users) {
    console.log(`Seeded admin user ${(process.env.ADMIN_EMAIL || "admin@zebramotor.rw").toLowerCase()}.`);
  } else if (after.users === 0) {
    console.warn("ADMIN_PASSWORD is not set in .env, skipped creating the admin user. Set it and re-run npm run db:seed.");
  } else {
    console.log("Admin user already present, skipped.");
  }
  console.log("Seed complete.");
}

main();
