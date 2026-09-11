// ---------------------------------------------------------------------------
// SEED DATA (Phase 3B, extracted from scripts/seed.js so it can run in two
// places: the standalone `npm run db:seed` CLI script, AND automatically
// inside lib/db/client.js's getDb() the first time a fresh, empty database
// is opened. The second use is what makes the site actually show real
// content on a serverless host like Netlify or Vercel, where nothing ever
// gets a chance to run `npm run db:seed` by hand, see the comment in
// client.js.
//
// Nothing here is invented: this is the exact same confirmed, real data
// (the 4 real vehicles, the 3 real reviews quoted from zebramotors.rw, the
// real business contact settings, the honestly-worded FAQ/guide copy) that
// already lived in scripts/seed.js. Moving it here did not change a single
// value, only where the code lives.
//
// Safe to call any time: every insert is guarded by a "does this already
// exist" check, so calling seedDatabase() again on an already-seeded
// database is a harmless no-op.
//
// Admin bootstrap (ensureAdminUser) is deliberately a separate function, not
// folded into seedDatabase()'s "only runs once, on an empty database" gate.
// seedDatabase() is called by client.js only the first time the vehicles
// table is empty, so on a database that already has vehicles (a real
// production database that has been running a while), seedDatabase() never
// runs again, and an admin account added later by setting ADMIN_EMAIL /
// ADMIN_PASSWORD for the first time would never get created. ensureAdminUser
// is called by client.js on every single getDb() initialization instead
// (one cheap SELECT by email), so setting those two env vars and redeploying
// is always enough to get a working admin login, independent of whatever
// state the rest of the database is in. See Section 4 of the
// presentation-readiness pass.
// ---------------------------------------------------------------------------

import bcrypt from "bcryptjs";

function newId() {
  return crypto.randomUUID();
}
function nowIso() {
  return new Date().toISOString();
}

// Requires ADMIN_EMAIL / ADMIN_PASSWORD to be set wherever this runs. In
// local dev, Next.js loads .env automatically. On a host like Vercel or
// Netlify, these must be added as real environment variables in that host's
// own project settings, they are not read from any committed file (.env is
// gitignored on purpose). If ADMIN_PASSWORD is not set, this does nothing,
// it never invents a password. If a user with that email already exists,
// this does nothing either, it never overwrites a password that may have
// been changed since (there is no self-service admin password change yet,
// so today that only matters if ADMIN_PASSWORD itself changes after the
// account already exists, in which case update it by hand via SQL, this
// intentionally does not silently resync it every boot).
// Real, publicly published coordinates (city center / park headquarters,
// cross-checked against multiple public sources) for the five destinations
// this site has always named (guide articles, FAQ, packages). Not a
// business fact Zebra needs to confirm, the same way any place's real
// coordinates are simply a geographic fact. An admin can still correct any
// of these at /admin/destinations for a more precise point (a specific
// gate or office), see backfillDestinationCoordinates() below for why a
// correction is never overwritten.
const SEED_DESTINATIONS = [
  { slug: "kigali", name: "Kigali", region: "Kigali", category: "CITY", description: "City orientation, memorial, markets. Roads paved and easy for self-drive.", lat: -1.9441, lng: 30.0619 },
  { slug: "akagera-national-park", name: "Akagera National Park", region: "Eastern Province", category: "NATIONAL_PARK", description: "About 2.5 to 3 hours from Kigali. Game drives, some unpaved park roads, 4WD recommended.", recommendedVehicleCategory: "SUV", lat: -1.6333, lng: 30.7833 },
  { slug: "lake-kivu", name: "Lake Kivu", region: "Western Province", category: "LAKE", description: "Scenic lakeside roads via Musanze or Karongi, relaxed pace.", lat: -1.7030, lng: 29.2604 },
  { slug: "volcanoes-national-park", name: "Volcanoes National Park", region: "Northern Province", category: "NATIONAL_PARK", description: "About 2 to 3 hours from Kigali. Early starts for gorilla trekking, permits booked separately.", recommendedVehicleCategory: "SUV", lat: -1.4323, lng: 29.5948 },
  { slug: "nyungwe-forest", name: "Nyungwe Forest", region: "Southern Province", category: "NATIONAL_PARK", description: "About 5 to 6 hours from Kigali via Huye. Canopy walk and forest trekking.", lat: -2.4873, lng: 29.2890 },
];

// Runs on every startup (called from client.js unconditionally, the same
// pattern as ensureAdminUser below, and for the same reason: a database
// that already had rows before this pass added real coordinates would
// otherwise never get them, seedDatabase()'s "only on an empty table" gate
// only ever helps a brand new database). ONLY fills a genuinely empty
// lat/lng on one of these five specific, well-known destinations, an admin
// who already entered or corrected a coordinate through
// /admin/destinations is never overwritten, this exclusively fills a real
// gap. A no-op (zero rows touched) on a fresh database, since the insert
// above already sets these coordinates directly.
export async function backfillDestinationCoordinates(db) {
  const stmt = db.prepare(
    "UPDATE destinations SET lat = ?, lng = ?, updated_at = ? WHERE slug = ? AND lat IS NULL AND lng IS NULL"
  );
  for (const d of SEED_DESTINATIONS) {
    if (!Number.isFinite(d.lat) || !Number.isFinite(d.lng)) continue;
    await stmt.run(d.lat, d.lng, nowIso(), d.slug);
  }
}

export async function ensureAdminUser(db, env = process.env) {
  const adminEmail = (env.ADMIN_EMAIL || "").trim().toLowerCase();
  const adminPassword = env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    return { created: false, reason: "ADMIN_EMAIL or ADMIN_PASSWORD not set" };
  }
  const existingAdmin = await db.prepare("SELECT id FROM users WHERE email = ?").get(adminEmail);
  if (existingAdmin) {
    return { created: false, reason: "admin user already exists" };
  }
  const passwordHash = bcrypt.hashSync(adminPassword, 12);
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?)`
    )
    .run(newId(), adminEmail, passwordHash, "Zebra Admin", "SUPER_ADMIN", now, now);
  return { created: true };
}

export async function seedDatabase(db, env = process.env) {
  // --- Business settings (real, confirmed values) -------------------------
  const existingSettings = await db.prepare("SELECT id FROM business_settings WHERE id = 'singleton'").get();
  if (!existingSettings) {
    await db
      .prepare(
        `INSERT INTO business_settings
          (id, company_name, legal_name, phone, phone_display, whatsapp, email, address, city,
           country, timezone, default_currency, supported_currencies, supported_languages,
           business_hours, emergency_phone, social_links, updated_at)
         VALUES ('singleton', ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      )
      .run(
        "Zebra Motors",
        "NOT YET CONFIRMED",
        "+250 784 111 206",
        "+250 784 111 206",
        null, // whatsapp: not listed on zebramotors.rw, do not assume it
        "info@zebramotor.rw",
        "Kigali, Rwanda",
        "Kigali",
        "Rwanda",
        "Africa/Kigali",
        "RWF",
        JSON.stringify(["RWF"]),
        JSON.stringify(["en"]),
        "NOT YET CONFIRMED",
        "NOT YET CONFIRMED",
        JSON.stringify({}),
        nowIso()
      );
  }

  // --- Vehicles (real, published fleet data) -------------------------------
  const VEHICLES = [
    {
      slug: "kia-sorento", make: "KIA", model: "Sorento", name: "KIA Sorento",
      year: 2012, category: "SUV", seats: 8, doors: 4, transmission: "Automatic",
      fuel: "Diesel", drive: "4WD available", luggage: "3 large bags", ac: 1,
      dailyRateRWFMin: 40000, dailyRateRWFMax: 50000,
      tags: ["families", "roadtrip", "safari"], badge: "Best for families",
      description:
        "A high clearance SUV suited to families and small groups travelling beyond Kigali. Diesel engine and part time 4WD handle the unpaved sections toward Volcanoes National Park and Akagera, and automatic transmission keeps city driving simple for first time visitors.",
    },
    {
      slug: "kia-k5", make: "KIA", model: "K5", name: "KIA K5",
      year: 2013, category: "Sedan", seats: 4, doors: 4, transmission: "Automatic",
      fuel: "Hybrid", drive: "2WD", luggage: "2 large bags", ac: 1,
      dailyRateRWFMin: 35000, dailyRateRWFMax: 40000,
      tags: ["business", "city"], badge: "Best for business",
      description:
        "A quiet, efficient hybrid sedan built for Kigali city driving and short business trips. Good fuel economy and a comfortable ride make it a practical choice for conference and NGO visitors who do not need 4WD.",
    },
    {
      slug: "toyota-corolla", make: "Toyota", model: "Corolla", name: "Toyota Corolla",
      year: 2011, category: "Sedan", seats: 5, doors: 4, transmission: "Automatic",
      fuel: "Petrol", drive: "2WD", luggage: "2 medium bags", ac: 1,
      dailyRateRWFMin: 25000, dailyRateRWFMax: 35000,
      tags: ["value", "city"], badge: "Best value",
      description:
        "A reliable, easy to drive sedan and a practical way to get around Kigali on your own schedule. A sensible choice for solo travellers and short stays who do not need extra space.",
    },
    {
      slug: "toyota-altis", make: "Toyota", model: "Altis", name: "Toyota Altis",
      year: 2003, category: "Sedan", seats: 4, doors: 4, transmission: "Automatic",
      fuel: "Petrol", drive: "2WD", luggage: "2 medium bags", ac: 1,
      dailyRateRWFMin: 25000, dailyRateRWFMax: 30000,
      tags: ["value", "city"], badge: "Best for Kigali",
      description:
        "A straightforward city car for getting around Kigali. Older than the rest of the fleet, priced accordingly, and a sensible option for short, in town rentals.",
    },
  ];
  const insertVehicle = db.prepare(
    `INSERT INTO vehicles
      (id, slug, make, model, display_name, year, category, transmission, fuel, drive,
       doors, seats, luggage, ac, daily_rate_rwf_min, daily_rate_rwf_max, tags, badge,
       description, status, featured, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  );
  for (const v of VEHICLES) {
    const existing = await db.prepare("SELECT id FROM vehicles WHERE slug = ?").get(v.slug);
    if (existing) continue;
    const now = nowIso();
    await insertVehicle.run(
      newId(), v.slug, v.make, v.model, v.name, v.year, v.category, v.transmission,
      v.fuel, v.drive, v.doors, v.seats, v.luggage, v.ac, v.dailyRateRWFMin,
      v.dailyRateRWFMax, JSON.stringify(v.tags), v.badge, v.description,
      "AVAILABLE", 1, now, now
    );
  }

  // --- Reviews (real, quoted verbatim from zebramotors.rw) -----------------
  const REVIEWS = [
    { name: "Nicky", stars: 5, text: "Well designed site , Create service, clean car, fair prices and friendly staff. Highly recommend!😍👌🇷🇼" },
    { name: "BENEGUSENGA Samuel", stars: 5, text: "The best company in Rwanda, I would recommend to anyone." },
    { name: "Jamal", stars: 4, text: "Good cars agency" },
  ];
  const reviewCount = (await db.prepare("SELECT COUNT(*) as c FROM reviews").get()).c;
  if (Number(reviewCount) === 0) {
    const insertReview = db.prepare(
      `INSERT INTO reviews (id, name, stars, text, source, verified, published, created_at)
       VALUES (?,?,?,?,?,?,?,?)`
    );
    for (const r of REVIEWS) {
      await insertReview.run(newId(), r.name, r.stars, r.text, "zebramotors.rw", 0, 1, nowIso());
    }
  }

  // --- FAQ -------------------------------------------------------------
  const FAQS = [
    { question: "Do I need an International Driving Permit to drive in Rwanda?", answer: "Bring both your passport and your home driving licence. Requirements for an International Driving Permit vary by nationality, so confirm directly with Zebra Motors or current Rwanda National Police guidance before you travel." },
    { question: "Can I book online and pay a deposit instead of the full amount?", answer: "Contact Zebra Motors directly to confirm current deposit and payment options for your booking." },
    { question: "What happens if I need to cancel?", answer: "Contact Zebra Motors directly to confirm the cancellation and refund policy for your booking." },
    { question: "Can I switch between self-drive and a professional driver?", answer: "Contact Zebra Motors directly to ask about switching between self-drive and a professional driver." },
    { question: "Which payment methods do you accept?", answer: "Contact Zebra Motors directly to confirm which payment methods (card, mobile money, or bank transfer) are currently available for your booking." },
    { question: "Do you deliver vehicles to Kigali International Airport?", answer: "Add your flight details at booking so Zebra can plan your arrival. See the Kigali Airport Car Rental guide for details." },
  ];
  const faqCount = (await db.prepare("SELECT COUNT(*) as c FROM faqs").get()).c;
  if (Number(faqCount) === 0) {
    const insertFaq = db.prepare(
      `INSERT INTO faqs (id, question, answer, category, published, sort_order, created_at, updated_at)
       VALUES (?,?,?,'general',1,?,?,?)`
    );
    for (let i = 0; i < FAQS.length; i++) {
      const f = FAQS[i];
      const now = nowIso();
      await insertFaq.run(newId(), f.question, f.answer, i, now, now);
    }
  }

  // --- Packages -------------------------------------------------------
  const PACKAGES = [
    { slug: "kigali-city-explorer", name: "Kigali City Explorer", duration: "1-2 days", summary: "Sedan with optional driver, city sights, the Kigali Genocide Memorial, local markets: ideal for a short business stopover.", includes: ["Vehicle", "Fuel to first tank", "Optional driver"], bestFor: ["Business Traveller", "Local Rwandan Customer"] },
    { slug: "akagera-safari-road-trip", name: "Akagera Safari Road Trip", duration: "4-5 days", summary: "4WD SUV, Kigali to Akagera National Park and back, with the ground clearance the park's unpaved roads call for.", includes: ["4WD SUV", "Unlimited mileage", "Optional driver-guide"], bestFor: ["European Leisure Tourist", "American Tourist", "Family on Vacation"] },
    { slug: "volcanoes-gorilla-trekking", name: "Volcanoes & Gorilla Trekking", duration: "3-4 days", summary: "4WD to Musanze, timed for an early trekking start. Gorilla trekking permits are booked separately through the Rwanda Development Board.", includes: ["4WD SUV", "Driver recommended for mountain roads"], bestFor: ["European Leisure Tourist", "American Tourist"] },
    { slug: "lake-kivu-escape", name: "Lake Kivu Escape", duration: "3-5 days", summary: "Sedan or SUV via the scenic Musanze or Karongi road, built for a relaxed lakeside stay.", includes: ["Vehicle", "Unlimited mileage"], bestFor: ["Family on Vacation", "Rwandan Diaspora Customer"] },
    { slug: "business-traveller", name: "Business Traveller", duration: "Per day", summary: "Sedan with driver, airport transfer included, invoiced to a company: built for conference and NGO visits.", includes: ["Driver", "Airport transfer", "Corporate invoicing"], bestFor: ["Business Traveller", "Long-Term Corporate Customer", "Tour Operator / Travel Agency"] },
    { slug: "airport-transfer", name: "Airport Transfer", duration: "One-way", summary: "A single pickup or drop-off at Kigali International Airport.", includes: ["Driver"], bestFor: ["All personas"] },
  ];
  const pkgCount = (await db.prepare("SELECT COUNT(*) as c FROM packages").get()).c;
  if (Number(pkgCount) === 0) {
    const insertPkg = db.prepare(
      `INSERT INTO packages (id, slug, name, duration, summary, includes, best_for, published, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,1,?,?)`
    );
    for (const p of PACKAGES) {
      const now = nowIso();
      await insertPkg.run(newId(), p.slug, p.name, p.duration, p.summary, JSON.stringify(p.includes), JSON.stringify(p.bestFor), now, now);
    }
  }

  // --- Rwanda Guide articles -----------------------------------------
  const ARTICLES = [
    {
      slug: "self-drive-rwanda-what-visitors-need-to-know",
      title: "Self-Drive Rwanda: What International Visitors Need to Know",
      excerpt: "The documents, road rules, and terrain realities that matter before you take the wheel in Rwanda.",
      body: [
        "Rwanda drives on the right-hand side of the road, which is the same side as continental Europe and North America but the opposite of the UK, and a genuine adjustment if you're used to left-hand driving.",
        "You will need your passport and a valid driving licence from your home country. Whether an International Driving Permit is also required varies by nationality, confirm with Zebra Motors or current Rwanda National Police guidance before you travel.",
        "Kigali's main roads are paved and well maintained, with organised traffic and clear signage. Outside the capital, expect a mix: the main routes toward Musanze (for Volcanoes National Park) and toward the southern and western provinces are paved, while roads inside national parks and some rural connector roads are unpaved, uneven, and better suited to a vehicle with higher clearance or 4WD.",
        "Motorbike taxis (moto-taxis) are everywhere in Kigali and move unpredictably by the standards of a first-time visitor. Give them a wide berth rather than assuming they'll hold a lane.",
        "Fuel stations are common in Kigali and along main highways, less so in remote areas. It's worth refuelling before a long rural leg rather than waiting until the tank is low.",
        "If a route includes unpaved sections (Akagera's internal park roads, some approaches to Lake Kivu, higher-altitude roads near Volcanoes National Park), choose an SUV with 4WD rather than a sedan. Zebra's vehicle detail pages note which trip types each vehicle suits.",
        "If any of this feels like more than you want to manage on unfamiliar roads, a professional driver is available on every vehicle in the fleet. See our chauffeur service page.",
      ],
    },
    {
      slug: "kigali-airport-car-rental-guide",
      title: "Kigali Airport Car Rental: A First-Time Visitor's Guide",
      excerpt: "What actually happens between landing at Kigali International Airport and driving away.",
      body: [
        "Kigali International Airport (Kigali) is Rwanda's main gateway, and most international arrivals land here regardless of final destination.",
        "If you booked a Zebra vehicle with airport pickup, share your flight number and arrival time when you book, or afterward by contacting Zebra directly, so your pickup can be planned around your actual arrival. There is no automatic live flight tracking yet, so share delays with Zebra directly by phone.",
        "After collecting your luggage, look for your named Zebra representative at arrivals. Confirm the exact meeting point with Zebra when you book.",
        "Handover includes a short joint vehicle inspection: exterior condition, mileage, and fuel level are noted and photographed before you drive off, which protects both you and Zebra if a dispute comes up later about existing damage or fuel level at return.",
        "From the airport, central Kigali is a short, well-signposted drive on paved roads, a reasonable first stretch of driving even if you're not yet confident on Rwandan roads.",
        "Night-arrival policy, any airport delivery surcharge, and airport returns are being confirmed with Zebra management. Contact Zebra directly to ask before booking.",
      ],
    },
  ];
  const articleCount = (await db.prepare("SELECT COUNT(*) as c FROM guide_articles").get()).c;
  if (Number(articleCount) === 0) {
    const insertArticle = db.prepare(
      `INSERT INTO guide_articles (id, slug, title, excerpt, content, category, status, published_at, created_at, updated_at)
       VALUES (?,?,?,?,?,'general','published',?,?,?)`
    );
    for (const a of ARTICLES) {
      const now = nowIso();
      await insertArticle.run(newId(), a.slug, a.title, a.excerpt, JSON.stringify(a.body), now, now, now);
    }
  }

  // --- Rental extras (real, admin-controlled optional services) -----------
  // The booking flow used to show fixed numbers nobody at Zebra had actually
  // confirmed ("Airport delivery, estimated RWF 15,000", "GPS, estimated
  // RWF 3,000/day"). Those were fabricated prices and have been removed.
  // Every row here starts inactive with no price, the honest state until
  // Zebra management confirms a real one in /admin/extras. The public
  // booking flow only ever shows an extra when active = 1 AND (price_rwf is
  // set OR pricing_type = 'CUSTOM_QUOTE'), see lib/db/extras.js.
  const EXTRAS = [
    { key: "airport_delivery", name: "Airport delivery", description: "Vehicle delivered to or collected from Kigali International Airport instead of the Zebra office.", pricingType: "PER_BOOKING" },
    { key: "gps", name: "GPS navigation device", description: "A standalone GPS unit provided with the vehicle.", pricingType: "PER_DAY" },
    { key: "child_seat", name: "Child seat", description: "A child car seat fitted to the vehicle.", pricingType: "PER_DAY" },
    { key: "extra_driver", name: "Additional driver", description: "A second named driver authorised on the rental agreement.", pricingType: "PER_DAY" },
  ];
  const extrasCount = (await db.prepare("SELECT COUNT(*) as c FROM rental_extras").get()).c;
  if (Number(extrasCount) === 0) {
    const insertExtra = db.prepare(
      `INSERT INTO rental_extras (id, key, name, description, pricing_type, price_rwf, active, created_at, updated_at)
       VALUES (?,?,?,?,?,NULL,0,?,?)`
    );
    for (const e of EXTRAS) {
      const now = nowIso();
      await insertExtra.run(newId(), e.key, e.name, e.description, e.pricingType, now, now);
    }
  }

  // --- Destinations (real places already named elsewhere on this site) ----
  // These five are not new information, they are the same places already
  // named in the guide articles, FAQ, and packages seeded above, migrated
  // out of the hardcoded list that used to live in components/
  // TripPlanner.js into a real, admin-editable table (Rule 2: nothing
  // invented here, this is the site's own existing confirmed content).
  // Coordinates (SEED_DESTINATIONS below) are real, publicly published
  // geographic locations, not a business fact Zebra needs to confirm. No
  // photos yet, those need a real admin upload, same as vehicles.
  const destinationCount = (await db.prepare("SELECT COUNT(*) as c FROM destinations").get()).c;
  if (Number(destinationCount) === 0) {
    const insertDestination = db.prepare(
      `INSERT INTO destinations (id, slug, name, description, region, category, recommended_vehicle_category, lat, lng, published, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,1,?,?)`
    );
    for (const d of SEED_DESTINATIONS) {
      const now = nowIso();
      await insertDestination.run(newId(), d.slug, d.name, d.description, d.region, d.category, d.recommendedVehicleCategory || null, d.lat, d.lng, now, now);
    }
  }

  // --- Admin user ------------------------------------------------------
  // See ensureAdminUser() above, this call is kept here too so the
  // standalone `npm run db:seed` CLI script (which only calls
  // seedDatabase(), not client.js's getDb()) still bootstraps an admin
  // account on a brand new local database in one step.
  await ensureAdminUser(db, env);
}
