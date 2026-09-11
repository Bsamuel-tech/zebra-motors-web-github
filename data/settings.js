// ---------------------------------------------------------------------------
// BUSINESS SETTINGS
// ---------------------------------------------------------------------------
// PHASE 3B UPDATE: the real, admin-editable source of truth is now the
// business_settings table in the database (see lib/db/settings.js and
// /admin/settings). Server components under app/(site)/ fetch that live
// row instead of importing this file. This object remains as: (1) the seed
// data prisma/schema.sql and scripts/seed.js load on first run, and (2) a
// fallback default for the handful of client components (contact page,
// airport pickup page, plan-your-trip) that have not yet been split into a
// server/client pair to receive live settings as a prop, see the README's
// Phase 3B status section for exactly which pages still use this fallback.
//
// Values below are the confirmed, real Zebra Motors details. Anything not
// yet confirmed by Zebra management is marked NOT YET CONFIRMED rather than
// invented, per the platform's non negotiable rule against fabricating
// business information.
// ---------------------------------------------------------------------------

export const settings = {
  companyName: "Zebra Motors",
  legalName: "NOT YET CONFIRMED",
  phone: "+250 784 111 206",
  phoneDisplay: "+250 784 111 206",
  // WhatsApp is NOT listed anywhere on zebramotors.rw (checked directly). Do
  // not assume this number takes WhatsApp messages until Zebra confirms it;
  // showing a WhatsApp link customers can't reach is worse than not showing
  // one. Leave null until confirmed, see whatsappLink() below.
  whatsapp: null,
  email: "info@zebramotor.rw",
  address: "Kigali, Rwanda",
  city: "Kigali",
  country: "Rwanda",
  timezone: "Africa/Kigali",
  defaultCurrency: "RWF",
  // Currency conversion display is real (see lib/currency.js,
  // components/CurrencySwitcher.js): an admin adds a currency and its real
  // exchange rate at /admin/settings, which appends it here
  // (business_settings.currency_rates). A fresh install starts with none
  // configured, RWF only, until Zebra actually enters a rate, never a
  // guessed one.
  supportedCurrencies: ["RWF"],
  currencyRates: {},
  // Site chrome (header, footer, homepage hero) is translatable into
  // English, French, and Kinyarwanda today, see lib/i18n/dictionaries.js and
  // components/LanguageSwitcher.js. This particular list is unrelated to
  // that, it is Zebra's own confirmed language(s) of business, left at
  // English only until Zebra confirms otherwise.
  supportedLanguages: ["en"],
  businessHours: "NOT YET CONFIRMED",
  emergencyPhone: "NOT YET CONFIRMED",
  socialLinks: {},
};

// Builds a wa.me link with a prefilled, contextual message, per the
// platform's WhatsApp contact requirement. Falls back to a generic message
// when no vehicle or dates are supplied. Accepts a settings object (usually
// the live one fetched from the database, see lib/db/settings.js) so pages
// wired to Phase 3B pass the current number rather than this static
// fallback.
// Returns null when no WhatsApp number is confirmed, so callers can hide the
// link entirely instead of pointing customers at a number that may not
// actually take WhatsApp messages (see the comment on settings.whatsapp).
export function whatsappLink({ vehicleName, fromDate, toDate, settings: s = settings } = {}) {
  if (!s.whatsapp) return null;
  const digits = s.whatsapp.replace(/[^\d]/g, "");
  let text = `Hello Zebra Motors, I would like some information about renting a vehicle.`;
  if (vehicleName && fromDate && toDate) {
    text = `Hello Zebra Motors, I am interested in renting the ${vehicleName} from ${fromDate} to ${toDate}.`;
  } else if (vehicleName) {
    text = `Hello Zebra Motors, I am interested in renting the ${vehicleName}.`;
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function telLink(s = settings) {
  return `tel:${s.phone.replace(/[^\d+]/g, "")}`;
}

export function mailtoLink(s = settings) {
  return `mailto:${s.email}`;
}
