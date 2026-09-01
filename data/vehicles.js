// ---------------------------------------------------------------------------
// FLEET DATA
// ---------------------------------------------------------------------------
// This is the ONLY file you need to touch to add, remove, or reprice a
// vehicle. Nothing in /app or /components has vehicle details hardcoded,
// every page reads from this list. Copy an existing entry, change the
// fields, and it appears on the site automatically (fleet grid, homepage
// featured cars, vehicle detail page, trip planner recommendations).
//
// The four vehicles below are the real fleet as currently published on
// zebramotors.rw (year, category, seats, doors, transmission, fuel, and
// daily price range), used as the confirmed seed data for this platform.
// The source site lists KIA K5 and the two Toyota sedans under its own
// "Other" / "Luxury" category labels; this file instead groups them by
// actual body type (Sedan) for filtering and trip matching, since that is
// what customers are actually choosing between. Nothing about the
// specifications themselves has been changed. NOT YET CONFIRMED: exact
// fleet size (how many physical units of each model Zebra owns), rental
// policy details (insurance, deposit, mileage allowance, fuel policy,
// cancellation window). Those stay out of this file until Zebra management
// confirms them, see /app/insurance and the [CONFIRM] markers throughout
// the trust pages.
// ---------------------------------------------------------------------------

export const vehicles = [
  {
    id: "kia-sorento",
    name: "KIA Sorento",
    year: 2012,
    category: "SUV",
    seats: 8,
    doors: 4,
    transmission: "Automatic",
    fuel: "Diesel",
    drive: "4WD available",
    luggage: "3 large bags",
    ac: true,
    dailyRateRWFMin: 40000,
    dailyRateRWFMax: 50000,
    tags: ["families", "roadtrip", "safari"],
    badge: "Best for families",
    description:
      "A high clearance SUV suited to families and small groups travelling beyond Kigali. Diesel engine and part time 4WD handle the unpaved sections toward Volcanoes National Park and Akagera, and automatic transmission keeps city driving simple for first time visitors.",
  },
  {
    id: "kia-k5",
    name: "KIA K5",
    year: 2013,
    category: "Sedan",
    seats: 4,
    doors: 4,
    transmission: "Automatic",
    fuel: "Hybrid",
    drive: "2WD",
    luggage: "2 large bags",
    ac: true,
    dailyRateRWFMin: 35000,
    dailyRateRWFMax: 40000,
    tags: ["business", "city"],
    badge: "Best for business",
    description:
      "A quiet, efficient hybrid sedan built for Kigali city driving and short business trips. Good fuel economy and a comfortable ride make it a practical choice for conference and NGO visitors who do not need 4WD.",
  },
  {
    id: "toyota-corolla",
    name: "Toyota Corolla",
    year: 2011,
    category: "Sedan",
    seats: 5,
    doors: 4,
    transmission: "Automatic",
    fuel: "Petrol",
    drive: "2WD",
    luggage: "2 medium bags",
    ac: true,
    dailyRateRWFMin: 25000,
    dailyRateRWFMax: 35000,
    tags: ["value", "city"],
    badge: "Best value",
    description:
      "A reliable, easy to drive sedan and a practical way to get around Kigali on your own schedule. A sensible choice for solo travellers and short stays who do not need extra space.",
  },
  {
    id: "toyota-altis",
    name: "Toyota Altis",
    year: 2003,
    category: "Sedan",
    seats: 4,
    doors: 4,
    transmission: "Automatic",
    fuel: "Petrol",
    drive: "2WD",
    luggage: "2 medium bags",
    ac: true,
    dailyRateRWFMin: 25000,
    dailyRateRWFMax: 30000,
    tags: ["value", "city"],
    badge: "Best for Kigali",
    description:
      "A straightforward city car for getting around Kigali. Older than the rest of the fleet, priced accordingly, and a sensible option for short, in town rentals.",
  },
];

export function getVehicleById(id) {
  return vehicles.find((v) => v.id === id);
}

// Formats a whole-number RWF amount with thousands separators, e.g. 40000
// becomes "40,000".
export function formatRWF(amount) {
  return Math.round(amount).toLocaleString("en-US");
}

// The customer-facing price is always the confirmed real range, never a
// single invented number.
export function priceRangeLabel(v) {
  return `RWF ${formatRWF(v.dailyRateRWFMin)} to ${formatRWF(v.dailyRateRWFMax)}/day`;
}

// Midpoint of the published range, used only for internal sorting and trip
// planner budget scoring. Never shown to a customer as "the price", the UI
// always displays priceRangeLabel() instead.
export function midRateRWF(v) {
  return Math.round((v.dailyRateRWFMin + v.dailyRateRWFMax) / 2);
}

// Weekly/monthly multipliers are illustrative discounts (15% off weekly,
// 35% off monthly). NOT YET CONFIRMED: real tiered pricing has not been set
// by management, see the discovery report, Section BB.
export function weeklyRateRWF(v) {
  return Math.round(midRateRWF(v) * 7 * 0.85);
}
export function monthlyRateRWF(v) {
  return Math.round(midRateRWF(v) * 30 * 0.65);
}
