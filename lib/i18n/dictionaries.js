// ---------------------------------------------------------------------------
// UI TRANSLATIONS (site chrome only)
// ---------------------------------------------------------------------------
// Scope, stated honestly: this covers the header, footer, and homepage hero,
// the parts of the site every visitor sees regardless of which page they
// land on. It does NOT translate page bodies (vehicle descriptions, FAQ
// answers, Rwanda Guide articles, admin-published knowledge base articles),
// that is real business content an admin writes at /admin/*, and inventing
// a French or Kinyarwanda version of it here would be putting words in
// Zebra Motors' mouth the business never actually said, the same rule this
// codebase already applies to reviews and business facts. Full content
// translation is a real future step, either a professional translator or,
// once an AI provider is actually connected (see lib/ai/provider.js), a
// reviewed, admin-approved AI translation of each published article.
//
// French (fr) here was written directly. Kinyarwanda (rw) is a good-faith
// draft, not written or checked by a native speaker, if Zebra has Rwandan
// staff, it is well worth having them read this file and correct it before
// leaning on it for real customers.
// ---------------------------------------------------------------------------

export const SUPPORTED_LOCALES = ["en", "fr", "rw"];

export const LOCALE_LABELS = {
  en: "English",
  fr: "Français",
  rw: "Ikinyarwanda",
};

export const DICTIONARIES = {
  en: {
    nav: {
      fleet: "Fleet",
      chauffeur: "Chauffeur",
      airportPickup: "Airport Pickup",
      packages: "Packages",
      rwandaGuide: "Rwanda Guide",
      whatIf: "What If",
      about: "About",
      findACar: "Find a Car",
      signIn: "Sign in",
    },
    footer: {
      tagline: "Car rental and mobility services based in Kigali, Rwanda, serving local, diaspora and international customers.",
      servicesTitle: "Services",
      supportTitle: "Support",
      contactTitle: "Contact",
      selfDrive: "Self-drive rental",
      chauffeurService: "Chauffeur service",
      airportPickup: "Airport pickup",
      travelPackages: "Travel packages",
      faq: "FAQ",
      insurance: "Insurance",
      terms: "Terms & conditions",
      privacy: "Privacy policy",
      rights: "© 2026 Zebra Motors. All rights reserved.",
      pricesShownIn: "Prices shown in",
    },
    hero: {
      headline: "Professional car rental and mobility services in Rwanda.",
      subhead:
        "Self-drive, or ask about a professional driver. Share your flight details and Zebra will help plan your Kigali pickup. Browse the fleet and published pricing, then confirm your booking directly with Zebra.",
      ctaFindCar: "Find a Car",
      ctaPlanTrip: "Plan My Rwanda Trip",
      trust: [
        "Kigali-based, in-person handover",
        "Real customer reviews",
        "Phone support",
        "Self-drive, driver available on request",
      ],
    },
  },
  fr: {
    nav: {
      fleet: "Flotte",
      chauffeur: "Chauffeur",
      airportPickup: "Prise en charge à l'aéroport",
      packages: "Forfaits",
      rwandaGuide: "Guide du Rwanda",
      whatIf: "Simulateur",
      about: "À propos",
      findACar: "Trouver une voiture",
      signIn: "Se connecter",
    },
    footer: {
      tagline: "Location de voitures et services de mobilité basés à Kigali, au Rwanda, pour une clientèle locale, de la diaspora et internationale.",
      servicesTitle: "Services",
      supportTitle: "Assistance",
      contactTitle: "Contact",
      selfDrive: "Location sans chauffeur",
      chauffeurService: "Service avec chauffeur",
      airportPickup: "Prise en charge à l'aéroport",
      travelPackages: "Forfaits voyage",
      faq: "FAQ",
      insurance: "Assurance",
      terms: "Conditions générales",
      privacy: "Politique de confidentialité",
      rights: "© 2026 Zebra Motors. Tous droits réservés.",
      pricesShownIn: "Prix affichés en",
    },
    hero: {
      headline: "Location de voitures et services de mobilité professionnels au Rwanda.",
      subhead:
        "Conduisez vous-même, ou demandez un chauffeur professionnel. Partagez les détails de votre vol et Zebra vous aidera à organiser votre prise en charge à Kigali. Parcourez la flotte et les tarifs publiés, puis confirmez votre réservation directement avec Zebra.",
      ctaFindCar: "Trouver une voiture",
      ctaPlanTrip: "Planifier mon voyage au Rwanda",
      trust: [
        "Basé à Kigali, remise en main propre",
        "Avis clients réels",
        "Assistance téléphonique",
        "Conduite seule, chauffeur disponible sur demande",
      ],
    },
  },
  rw: {
    nav: {
      fleet: "Imodoka zacu",
      chauffeur: "Umushoferi",
      airportPickup: "Kwakira ku Kibuga cy'Indege",
      packages: "Porogaramu z'Ingendo",
      rwandaGuide: "Amakuru y'u Rwanda",
      whatIf: "Igeragezo",
      about: "Abo turi bo",
      findACar: "Shakisha Imodoka",
      signIn: "Injira",
    },
    footer: {
      tagline: "Serivisi zo gukodesha imodoka n'ingendo dushingiye i Kigali, mu Rwanda, dukorera abaturage b'imbere mu gihugu, abo mu mahanga n'abasuye u Rwanda.",
      servicesTitle: "Serivisi",
      supportTitle: "Ubufasha",
      contactTitle: "Twandikire",
      selfDrive: "Gukodesha wikoreshereza",
      chauffeurService: "Serivisi y'Umushoferi",
      airportPickup: "Kwakira ku Kibuga cy'Indege",
      travelPackages: "Porogaramu z'Ingendo",
      faq: "Ibibazo Bikunze Kubazwa",
      insurance: "Ubwishingizi",
      terms: "Amabwiriza n'Amategeko",
      privacy: "Politiki y'Ibanga",
      rights: "© 2026 Zebra Motors. Uburenganzira bwose burabitswe.",
      pricesShownIn: "Ibiciro byerekanwe muri",
    },
    hero: {
      headline: "Gukodesha imodoka na serivisi z'ingendo zizewe mu Rwanda.",
      subhead:
        "Wikoreshereze imodoka, cyangwa usabe umushoferi w'umwuga. Duhe amakuru y'indege yawe kugira ngo Zebra igufashe gutegura kwakirwa i Kigali. Reba imodoka zacu n'ibiciro byatangajwe, hanyuma wemeze ubusabe bwawe na Zebra.",
      ctaFindCar: "Shakisha Imodoka",
      ctaPlanTrip: "Tegura Urugendo rwanjye mu Rwanda",
      trust: [
        "Dushingiye i Kigali, twakira mu maboko",
        "Ibitekerezo nyakuri by'abakiriya",
        "Ubufasha kuri telefoni",
        "Wikoreshereze, umushoferi ahari igihe ubisabye",
      ],
    },
  },
};
