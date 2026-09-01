// ---------------------------------------------------------------------------
// TRAVEL PACKAGES
// ---------------------------------------------------------------------------
// Add or remove a package by editing this list. Pricing is intentionally
// left blank ("CONFIRM"), packages are meant to be priced by Zebra
// management, not guessed at here.
// ---------------------------------------------------------------------------

export const packages = [
  {
    slug: "kigali-city-explorer",
    name: "Kigali City Explorer",
    duration: "1-2 days",
    summary:
      "Sedan with optional driver, city sights, the Kigali Genocide Memorial, local markets: ideal for a short business stopover.",
    includes: ["Vehicle", "Fuel to first tank", "Optional driver"],
    bestFor: ["Business Traveller", "Local Rwandan Customer"],
  },
  {
    slug: "akagera-safari-road-trip",
    name: "Akagera Safari Road Trip",
    duration: "4-5 days",
    summary:
      "4WD SUV, Kigali to Akagera National Park and back, with the ground clearance the park's unpaved roads call for.",
    includes: ["4WD SUV", "Unlimited mileage", "Optional driver-guide"],
    bestFor: ["European Leisure Tourist", "American Tourist", "Family on Vacation"],
  },
  {
    slug: "volcanoes-gorilla-trekking",
    name: "Volcanoes & Gorilla Trekking",
    duration: "3-4 days",
    summary:
      "4WD to Musanze, timed for an early trekking start. Gorilla trekking permits are booked separately through the Rwanda Development Board.",
    includes: ["4WD SUV", "Driver recommended for mountain roads"],
    bestFor: ["European Leisure Tourist", "American Tourist"],
  },
  {
    slug: "lake-kivu-escape",
    name: "Lake Kivu Escape",
    duration: "3-5 days",
    summary:
      "Sedan or SUV via the scenic Musanze or Karongi road, built for a relaxed lakeside stay.",
    includes: ["Vehicle", "Unlimited mileage"],
    bestFor: ["Family on Vacation", "Rwandan Diaspora Customer"],
  },
  {
    slug: "business-traveller",
    name: "Business Traveller",
    duration: "Per day",
    summary:
      "Sedan with driver, airport transfer included, invoiced to a company: built for conference and NGO visits.",
    includes: ["Driver", "Airport transfer", "Corporate invoicing"],
    bestFor: ["Business Traveller", "Long-Term Corporate Customer", "Tour Operator / Travel Agency"],
  },
  {
    slug: "airport-transfer",
    name: "Airport Transfer",
    duration: "One-way",
    summary:
      "A single pickup or drop-off at Kigali International Airport.",
    includes: ["Driver"],
    bestFor: ["All personas"],
  },
];

export function getPackageBySlug(slug) {
  return packages.find((p) => p.slug === slug);
}
