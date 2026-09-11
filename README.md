# Zebra Motors, Website and Admin Platform

## Current status, read this first

Everything below "Phase 3 status" is a snapshot written during Phase 3C and
was never updated as later phases shipped, it is kept for its historical
reasoning but should not be trusted for what exists today. Since it was
written, this codebase has since gained: real customer accounts and login
(not demo data), a real booking flow that writes to the database and is
visible to both the customer and admin, a real destinations database with
admin-managed multi-stop trip planning and live geocoding/routing, and,
most recently, a full AI architecture: Zebra AI Support (a customer chat
widget with a real tool-calling gateway, a knowledge base, and human
escalation to `/admin/support`), fixes to the What If explorer's context
handling and hardcoded destination list, and an AI-assisted trip parser.
None of this connects to a live AI provider yet, no API key exists in this
environment, everything AI-related runs on real, tested, honestly-labelled
deterministic logic today and is built to switch to a real model the
moment a key is added (see `lib/ai/provider.js`).

For the authoritative, line-by-line account of what is real, what is a UI
mock, and what still needs credentials, see `FINAL_FEATURE_AUDIT.md` and
`AI_ARCHITECTURE_REPORT.md` in this repository, both written from live
testing, not from reading code. Treat the payment/booking/AI claims in the
paragraphs below as history, not current fact.

This is a real, working Next.js application implementing the design system
and core customer journey from the discovery report and design canvas, with
a real backend: a database, admin authentication, and an admin panel
covering the fleet, bookings, customers, reviews, FAQ, travel packages, the
Rwanda Guide, and first-party analytics. Technical SEO (sitemap, robots.txt,
structured data) and PWA installability are also real and live.

## Running it

You need [Node.js](https://nodejs.org) 22 or newer installed (the database
layer uses Node's built-in SQLite support, which needs a recent version).
Run `node --version` to check what you have.

```bash
npm install
npm run db:seed   # creates prisma/dev.db and loads real seed data, first time only
npm run dev
```

Then open **http://localhost:3000** in your browser, and **http://localhost:3000/admin**
for the admin panel. Changes you make to files under `app/`, `components/`,
or `data/` show up immediately.

To produce a production build (what would actually get deployed):

```bash
npm run build
npm run start
```

### Admin login

`npm run db:seed` creates one admin account from the credentials in `.env`
(`ADMIN_EMAIL` / `ADMIN_PASSWORD`). Sign in at `/admin/login` with those,
then change the password by editing that account, there is no
self-service password change screen yet. `.env` is gitignored, it is not
part of what gets committed or shared.

## What moved into the database (Phase 3B)

The fleet and business contact information are no longer edited by hand in
`data/vehicles.js` and `data/settings.js`. They now live in a real SQLite
database (`prisma/dev.db`, schema in `prisma/schema.sql`) and are edited
through the admin panel:

- **Fleet** → `/admin/fleet`. Add a vehicle, edit its specs and price
  range, or change its status (available, reserved, rented, maintenance,
  unavailable, archived). A vehicle marked anything other than available,
  reserved, or rented immediately stops appearing on the public fleet page
  and homepage, it is not just hidden, the public API will not return it.
- **Business settings** → `/admin/settings`. Phone, WhatsApp, email,
  address, business hours. Every page that shows contact information reads
  this same record, changing it here updates the header, footer, contact
  page, and airport pickup page immediately.
- **Reviews** → `/admin/reviews`. Publish or hide a review. This does not
  create new reviews, per the platform's rule against fabricating reviews,
  only the three real ones quoted from zebramotors.rw exist right now.
- **FAQ** → `/admin/faq`. Add, edit, reorder, publish/hide, or delete an
  entry. Only published entries appear on the public `/faq` page.
- **Travel packages** → `/admin/packages`. Add or edit a package's name,
  duration, summary, inclusions, and "best for" tags, and publish/hide it.
  Pricing is intentionally not shown, that is still gated on the
  outstanding business policy decisions (see Section 20 of the discovery
  report).
- **Rwanda Guide** → `/admin/guides`. Add or edit an article's title,
  excerpt, category, and body, with a status of draft, published,
  scheduled, or archived. Only articles with status "published" appear on
  the public `/rwanda-guide` pages.
- **Vehicle photos** → `/admin/fleet/<vehicle>`, below the vehicle's own
  details. Upload a real photo (JPEG, PNG, or WebP), mark one as primary,
  or delete one. A vehicle with no uploaded photos still shows the grey
  placeholder everywhere, never a stock or invented image (Rule 5). Files
  are served through `app/uploads/[...path]/route.js` rather than Next's
  `public/` folder, since `next start` snapshots `public/` at startup and
  would 404 a photo uploaded after the server was already running, a real
  bug caught during verification, not a theoretical one.
- **Bookings** → `/admin/bookings`. Lists real bookings and lets staff move
  one through pending, confirmed, cancelled, or completed. Empty right now
  and correctly so, the public booking flow is still a demo that saves
  nowhere, this page is ready for the moment Phase 3D exists.
- **Customers** → `/admin/customers`. Same story, a customer record is only
  ever created by a real booking, so this is honestly empty until Phase 3D.
- **Analytics** → `/admin/analytics`. Real, first-party page view counts
  logged server-side as people browse the live site, no third-party
  script, no cookies, no visitor identifiers. Shows total views, the
  most-viewed pages and vehicles, and a day-by-day count over the last 30
  days. This is not a replacement for a full analytics platform if Zebra
  chooses one later, it answers "what gets looked at" honestly with zero
  external dependencies.

`data/vehicles.js`, `data/settings.js`, `data/faq.js`, `data/packages.js`,
and `data/guideArticles.js` still exist. `scripts/seed.js` loads its data
from a copy of the same real values into the database on first run, and a
handful of pages (the demo booking flow in `components/BookingFlow.js`,
the trip planner's own pure helper functions) still import a static file
directly, see "What's still static" below.

### Why SQLite instead of Postgres, for now

The specification calls for PostgreSQL. The environment this was built in
blocked Prisma's engine download during setup (`binaries.prisma.sh`
returned 403 Forbidden), so the backend uses Node's own built-in `node:sqlite`
module instead (stable in current Node 22 and 24 releases). It needs no
separate package and no compiling, so nothing on your machine needs to
match it, no Visual Studio, no build tools, it works the same way `fs` or
`path` do. You will see one harmless line in the terminal the first time
each command touches the database: `ExperimentalWarning: SQLite is an
experimental feature`, that is expected, not an error.

The schema in `prisma/schema.sql` is written as ordinary relational SQL
with no SQLite-specific tricks, moving to a managed Postgres later is a
driver swap in `lib/db/client.js`, not a schema rewrite. This is worth
revisiting once real hosting is chosen (see the published Phase 3 report's
decisions needed section), a production deployment should use a real
managed Postgres instance, not a SQLite file on disk.

## SEO and PWA (Phase 3E, 3H)

- **`/sitemap.xml`** lists every real static page plus every currently
  public vehicle, published package, and published guide article, built
  live from the same database the pages themselves read (`app/sitemap.js`).
- **`/robots.txt`** allows everything customer-facing and disallows
  `/admin`, `/account`, `/api`, and `/login` (`app/robots.js`).
- **Structured data**: every public page carries an `AutoRental` JSON-LD
  block (`app/(site)/layout.js`) built only from fields Zebra has actually
  confirmed, name, phone, email, city, country. Fields still marked "NOT
  YET CONFIRMED" in Business Settings (legal name, business hours,
  emergency phone) are left out entirely rather than published to search
  engines as literal placeholder text.
- **Open Graph and Twitter Card metadata** are set on every page
  (`app/layout.js`), with no share image, since there is no real
  photography yet (Rule 5), a placeholder graphic would look worse in a
  social preview than no image at all.
- **Installable as a PWA**: `app/manifest.js` plus a conservative service
  worker (`public/sw.js`) that only caches Next's own fingerprinted build
  assets and the two icon files, never a page and never an API response,
  since this whole backend's point is that admin edits show up immediately
  and a caching service worker could silently undo that. The two icons
  under `public/icons/` are a plain placeholder built from the site's own
  colors and a "Z", not a real logo, swap them the moment Zebra has brand
  assets.

## What's still static

A few pages have not been wired to the database yet, this was a deliberate
scope decision for this pass (work incrementally, per the platform's own
rule against implementing everything at once), not an oversight:

- **The demo booking flow** (`components/BookingFlow.js`, reached from
  "Continue to book") still reads vehicles from `data/vehicles.js`. It does
  not save anywhere regardless, so this does not affect correctness, only
  where the demo pulls its vehicle list from.
- **Bookings, customers, and payments** have database tables and admin
  list views ready (`bookings`, `customers`, see `/admin/bookings` and
  `/admin/customers` above) for Phase 3D, but nothing writes to them yet.

## What's real vs. demo right now

| Feature | Status |
|---|---|
| Fleet browsing, filtering, vehicle detail | Real, reads live from the database. Admin-editable at `/admin/fleet` |
| Vehicle availability status | Real, enforced by the database. A vehicle marked unavailable cannot appear on the public site |
| Contact information (phone, email, address) | Real, centralized in the database. Admin-editable at `/admin/settings` |
| Customer reviews on the homepage | Real, quoted verbatim from zebramotors.rw. Publish/hide only, no fabrication, at `/admin/reviews` |
| FAQ | Real, reads live from the database. Admin-editable at `/admin/faq` |
| Travel packages | Real, reads live from the database. Admin-editable at `/admin/packages`. No pricing shown, that is a decision pending business input |
| Rwanda Guide articles | Real, reads live from the database. Admin-editable at `/admin/guides`, draft/scheduled/archived statuses supported |
| Vehicle photos | Real upload and storage, admin-editable at `/admin/fleet/<vehicle>`. No photos exist yet since Zebra's shoot hasn't happened, every vehicle shows the grey placeholder until one is uploaded |
| Admin authentication | Real, a signed session cookie, bcrypt-hashed passwords, protected by `middleware.js` |
| Admin dashboard | Real fleet and review counts and a real audit log covering every admin change across fleet, settings, reviews, FAQ, packages, guides, and bookings. No fake bookings, payments, or revenue numbers, those require Phase 3D |
| Bookings and customers (admin) | Real list views and status updates, honestly empty until Phase 3D creates real records |
| Analytics | Real first-party page view logging, no third-party script or cookies, at `/admin/analytics` |
| Sitemap, robots.txt, structured data | Real, generated live from the database, see "SEO and PWA" below |
| PWA installability | Real, a working manifest and service worker, placeholder icons pending real branding |
| Trip planner recommendation | Real, transparent scoring logic in `lib/recommend.js`, not machine learning, and says so |
| Mobile navigation | Real, a working menu below 900px width |
| Booking flow (steps, extras, totals) | Real UI and math, labelled as a demo, does not save anywhere or charge a card |
| Payment step | UI only, no payment provider is connected yet |
| Customer account / bookings | Demo data (one sample booking), no real login or database |
| Currency and language switching | Not built, removed as non-functional fake UI, no confirmed requirements to build against (Phase 3E) |
| AI trip assistant / chatbot | Not built, would need real grounding data and an AI provider credential neither of which exist (Phase 3F) |
| Photography | Grey placeholder blocks, see the design system for the photography brief |

## Phase 3 status

The specification's own phase list runs 3A through 3H. Here is exactly
where each one stands, so nothing here is assumed rather than checked:

- **3A, audit and cleanup**: done. Mobile navigation, the dash style rule,
  removing fake content and reviews, centralizing contact info, removing
  the non-functional language and currency switcher, security headers.
- **3B, backend foundation**: done. Real database (`prisma/schema.sql`),
  authentication (`middleware.js`, `lib/auth/`), API routes, business
  settings.
- **3C, admin**: done. Fleet (with photo uploads), bookings, customers,
  reviews, packages, guides, FAQ, and settings all have real admin UI.
  Bookings and customers are honestly empty, nothing creates a real one
  until Phase 3D exists.
- **3D, real booking**: not built. Needs a payment provider and the
  outstanding business policy decisions (deposit amount, cancellation
  rule, insurance coverage, chauffeur rates, whether the fleet is really
  just these four vehicles) before availability enforcement, payment, and
  confirmation can be built without guessing at business facts (Rule 2).
- **3E, internationalization and SEO**: SEO is done, real sitemap,
  robots.txt, and structured data (see "SEO and PWA" above). Currency and
  language switching beyond English and RWF is not built, there is no
  confirmed requirement to build against, and a second non-functional
  switcher would repeat the exact mistake Phase 3A removed.
- **3F, AI**: the trip planner's recommendation engine is done and real,
  transparent scoring logic in `lib/recommend.js`, not machine learning,
  and the page says so. A conversational AI assistant is not built, it
  would need real grounding data and an AI provider credential, neither of
  which exists, and building one without them would be AI theater, which
  the specification itself forbids.
- **3G, analytics**: done, as first-party page view logging with no
  external provider or tracking ID needed (`/admin/analytics`). A real
  analytics platform (if Zebra chooses one) would still need its own
  account and credentials, which is a business decision, not a
  development task.
- **3H, PWA**: done, a working manifest and service worker
  (`app/manifest.js`, `public/sw.js`). Native mobile app evaluation, the
  spec's own next step after PWA, is unstarted, that is a much larger
  decision (React Native vs. platform-native, app store accounts) than
  anything else on this list.

See the published Phase 3 report for the full reasoning behind each
blocked item.

## Structure

```
app/(site)/          Public pages (Next.js App Router route group, URLs unchanged)
app/admin/            Admin panel: login, and a protected group with the sidebar shell
app/api/              Route handlers: auth, vehicles (+ photos), bookings, settings, reviews, faq, packages, guides
app/uploads/          Serves real uploaded vehicle photos from disk (not Next's public/ folder)
app/sitemap.js        Real, live sitemap.xml (Phase 3E)
app/robots.js         Real robots.txt (Phase 3E)
app/manifest.js       PWA manifest (Phase 3H)
components/           Shared UI (Header, Footer, VehicleCard, VehiclePhoto, BookingFlow, FaqAccordion, ServiceWorkerRegister, Photo)
components/admin/     Admin-only UI (VehicleForm, VehiclePhotoManager, SettingsForm, ReviewsTable, FaqForm, FaqList, PackageForm, GuideForm, BookingStatusControl)
data/                 Seed content and pure helper functions: vehicles, packages, guide articles, FAQ, settings
lib/db/               Database access functions (one file per entity, including vehiclePhotos, bookings, customers, analytics)
lib/auth/             Password hashing, session tokens, session lookup
lib/recommend.js      Trip planner scoring logic
prisma/schema.sql     The database schema
scripts/seed.js       Loads real seed data into a fresh database
uploads/              Real uploaded vehicle photo files live here (gitignored)
public/sw.js          Service worker (Phase 3H), only caches build assets and icons, never a page
public/icons/         Placeholder PWA icons, swap for real branding when it exists
middleware.js         Protects /admin/* routes
app/globals.css       Design system tokens and shared styles
```
