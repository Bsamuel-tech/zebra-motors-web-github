// ---------------------------------------------------------------------------
// RWANDA GUIDE ARTICLES
// ---------------------------------------------------------------------------
// Real, useful content only, replacing the mismatched used-car-buying blog
// found on the current zebramotors.rw during discovery. Add a new article
// by adding an object to this array with a unique slug.
//
// Anything wrapped in [CONFIRM: ...] is a factual or legal claim that needs
// sign-off from Zebra management or a current official source before
// publishing. Do not remove the bracket without actually confirming it.
// ---------------------------------------------------------------------------

export const guideArticles = [
  {
    slug: "self-drive-rwanda-what-visitors-need-to-know",
    title: "Self-Drive Rwanda: What International Visitors Need to Know",
    excerpt:
      "The documents, road rules, and terrain realities that matter before you take the wheel in Rwanda.",
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
    excerpt:
      "What actually happens between landing at Kigali International Airport and driving away.",
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

export function getArticleBySlug(slug) {
  return guideArticles.find((a) => a.slug === slug);
}
