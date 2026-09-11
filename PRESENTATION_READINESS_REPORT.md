# Zebra Motors: Presentation Readiness Report

Prepared 2026-09-01. Answers the ten items from the presentation-readiness and production-blocker pass, in order. Everything below was checked directly (production build, a running server, curl, and a headless browser at real breakpoints), not assumed. Where something has not been checked against the real production database, that is stated plainly rather than implied.

## A. Root cause of the admin errors

The admin errors reported earlier in this project were already fixed by a prior commit and re-verified live this pass: admin login, session issuance, and protected-route access all worked correctly against a fresh build. One additional real bug was found and fixed during this pass, not previously known: a leftover `DATABASE_URL="file:./dev.db"` value in `.env` (dead weight from an abandoned Prisma setup attempt) caused the new Postgres-detection code to try to open that SQLite-style value as a Postgres connection and crash with `ECONNREFUSED`. Fixed by only switching to Postgres when `DATABASE_URL` actually starts with `postgres://` or `postgresql://`; any other value, including that leftover one, now correctly falls back to SQLite.

## B. Database migration to Postgres

The app now supports both databases through one interface. `lib/db/adapter.js` defines `SqliteAdapter` and `PostgresAdapter`, both exposing the same `.prepare(sql).all()/.get()/.run()` shape, so none of the 21 modules in `lib/db/` need to know which database is active. `lib/db/client.js` picks the driver from `DATABASE_URL`: a real `postgres://`/`postgresql://` value uses `pg` with TLS enabled for non-localhost hosts, anything else uses SQLite. `prisma/schema.postgres.sql` mirrors `prisma/schema.sql` column for column; the only difference is the timestamp default (`datetime('now')` in SQLite versus `now() AT TIME ZONE 'utc'` in Postgres). All SQL in the codebase was written to be portable ANSI SQL before this migration, so no query needed to change, only the driver underneath it.

Honest status: this has been fully exercised against SQLite (every route, every write path, the full customer and admin auth flows) but has not yet run against a real Postgres database, because no `DATABASE_URL` has been provided. Written correctly is not the same as tested. This is the one item that needs you: create a Postgres database (Vercel Postgres, Neon, Supabase, or Render all work) and paste its connection string here so this can be verified for real before it is called done.

## C. Production admin bootstrap

Previously, the code that creates the admin account (`ensureAdminUser`) only ran the first time the vehicles table was empty, bundled inside the one-time seed step. That meant setting `ADMIN_EMAIL` and `ADMIN_PASSWORD` for the first time against an already-seeded database would silently never create an admin account, a real production trap. Fixed by extracting `ensureAdminUser(db, env)` into its own function that runs on every server start, independent of whether seeding happens. Verified two ways: restarting the server with a different admin email/password against an already-seeded database created the new admin without duplicating any vehicle data, and a separate test built a database in the exact pre-migration shape (missing the two newest columns, one pre-existing admin, one pre-existing vehicle) and confirmed on boot that the missing columns were added, the vehicle count stayed unchanged, the pre-existing admin was untouched, and the new admin from the environment variables was created alongside it.

## D. Admin login, session, logout, protected routes

Verified end to end against SQLite in a real production build: login succeeds with correct credentials and fails with a generic, non-revealing error otherwise; every route under `/admin/*` redirects to `/admin/login` with a `?next=` parameter when no session is present; every one of the 27 authenticated admin pages (dashboard, bookings, fleet, customers, leads, reviews, settings, trips, maintenance, analytics, destinations, faq, guides, packages, extras, the AI what-if tool, and each page's `new`/`[id]` edit routes) returns 200 with real data once logged in; logout clears the session and protected routes redirect again afterward. Not yet verified against Postgres, same blocker as item B.

## E. Customer sign-in

Built as Option A: real authentication, not a cosmetic change to the header. Signup requires a name, a valid email, and a password of at least 8 characters; passwords are hashed, never stored in plain text. Signing up with an email that already has a customer record (for example, one a staff member created while entering a phone booking) claims that existing record instead of creating a duplicate, unless it already has a password set, in which case signup is rejected with a clear "an account already exists, sign in instead" message. Login returns the same generic error whether the email is unknown or the password is wrong, so the system never confirms which emails have accounts. The session is a separate cookie and separate JWT payload kind from the admin session, so an admin token can never be presented as a customer session or vice versa. The header's "Sign in" link now reflects real state: it shows the customer's first name and links to `/account` once signed in, and reverts correctly after logout.

## F. The /account page

Rebuilt from scratch. It was previously 100 percent fake: a hardcoded name, a fabricated booking number, fabricated payment math, and navigation links to Documents, Payments, Saved Vehicles, and Reviews sections that had no real page or data behind any of them. All of that is gone. The real page shows the signed-in customer's actual name, email, and phone from the database, and their actual bookings, or an honest "You have no bookings yet" message with a link to browse the fleet when there are none. A booking detail page shows the real vehicle, dates, status, and total, with no fake PDF download or cancel button, and honest payment language ("arranged directly with Zebra Motors, no online payment is taken through this site"). Ownership is enforced at the query level: a customer's booking lookup only ever searches within their own bookings, verified by creating a second customer and confirming they get a 404, not someone else's data, when guessing another customer's booking URL.

## G. Booking Request MVP

A real customer can now submit a booking request from the public `/book` flow without any account or payment, and it creates a real row in the same `bookings` table `/admin/bookings` reads, starting at status PENDING. This is a genuine change from before, when the flow posted to `/api/leads` and created a lead, not a booking. Verified end to end: a public, unauthenticated request creates a booking with a real generated reference number, appears immediately in `/admin/bookings` tagged "Online request" (staff-entered bookings are tagged "Staff entered" for contrast), and a request missing required fields is rejected with a 400 rather than silently accepted. A new `bookings.source` column records which path created each row, added through both the schema and the incremental migration system so it applies safely to an already-existing database too.

## H. WhatsApp fallback

The confirmation screen at the end of a booking request now shows a real WhatsApp contact button with a message pre-filled with the vehicle, dates, and the customer's own booking reference, when a WhatsApp number is configured in business settings. If no WhatsApp number is configured, it honestly falls back to the phone and email contact details instead of showing a dead or fake link. WhatsApp business number itself remains NOT YET CONFIRMED, per Rule 2, until Zebra provides one.

## I. Fake payment flow

Reviewed both remaining steps of the booking flow. The Payment step was already honest before this pass: it explicitly states nothing is charged there and that payment has not yet been connected to a provider. The Documents step was not: it had non-functional "Upload" buttons that looked real but did nothing. Those have been replaced with plain "bring this with you at pickup, or email it ahead of time" text and no buttons that pretend to work. No payment is taken or referenced anywhere in the live flow.

## J. Route health and mobile responsiveness

Every route was hit against a fresh production build and fresh seed data: all public pages, all 27 admin pages (both logged out, where they correctly redirect, and logged in, where they return real data), the full customer signup, login, booking, and account journey, and 404 handling for bad IDs. Zero 500 errors, zero instances of a missed `await` leaking `[object Promise]` into rendered HTML.

Mobile responsiveness was tested with a headless browser at the five required widths (375, 390, 430, 768, 1440px) across every public and admin page, 195 checks in the main sweep plus 15 more for the signed-in customer pages. The first pass found three real, pre-existing layout bugs that would have shown broken pages on a phone at a live demo: the site footer used a fixed four-column grid that never collapsed, three separate booking and vehicle detail pages used a fixed-width sidebar card that did not shrink, and the admin dashboard sidebar was a fixed 220px column with no mobile behavior at all, forcing the whole admin panel into horizontal scroll on a phone. All three were fixed with plain CSS (the footer and admin sidebar now collapse to a stacked layout below 900px, the fixed-width cards now cap at their old width instead of forcing it, and every admin data table scrolls only within its own card rather than dragging the whole page sideways). After the fixes, all 210 checks pass with zero horizontal overflow at any of the five widths. This did not change how anything looks on a desktop or tablet screen, only how it behaves below 900px, so it is a fix, not a redesign.

## What is still open

Two items are blocked on a real Postgres connection string, which only you can provide: verifying the migration and every route against the actual production database (items B and D above). Everything else in this pass is built, tested against SQLite in a real production build, and ready.

## To deploy on Vercel

Set these environment variables in the Vercel project:

- `DATABASE_URL`: the real Postgres connection string from your provider (Vercel Postgres, Neon, Supabase, or similar). Must start with `postgres://` or `postgresql://`.
- `JWT_SECRET`: any long random string, used to sign both admin and customer session tokens. Generate one and keep it stable across deploys, changing it logs everyone out.
- `ADMIN_EMAIL`: the real email address for the admin account Zebra will sign in with.
- `ADMIN_PASSWORD`: the real password for that account. Change it after first login if you want it to differ from what you set here.

`VERCEL` is set automatically by the platform, no action needed. Push to the connected repository and Vercel will build and deploy; the admin account and, on first boot, the seed data are created automatically, no manual seed step is required.
