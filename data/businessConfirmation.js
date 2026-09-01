// ---------------------------------------------------------------------------
// BUSINESS CONFIRMATION REGISTRY
// ---------------------------------------------------------------------------
// A single, controlled source of truth for which business facts are real and
// confirmed versus still pending sign-off from Zebra Motors management. This
// exists so no page, component, or future AI feature has to guess: check a
// field's `status` here before presenting it to a customer as fact.
//
// Every field follows the same shape:
//   value:        the actual value, or null if nothing is confirmed yet
//   status:       "CONFIRMED" | "REQUIRES_CONFIRMATION"
//   source:       where the confirmed value came from, or null
//   lastUpdated:  ISO date this field was last checked or changed
//
// Rule for every part of this codebase: never render a REQUIRES_CONFIRMATION
// value to a customer as though it were settled. Either omit the section, or
// say plainly that it is being confirmed with Zebra Motors. Never invent a
// value to fill a gap here, and never remove a REQUIRES_CONFIRMATION status
// without an actual confirmation to point to as the source.
// ---------------------------------------------------------------------------

export const businessConfirmation = {
  businessName: {
    value: "Zebra Motors",
    status: "CONFIRMED",
    source: "official Zebra website, zebramotors.rw",
    lastUpdated: "2026-08-28",
  },
  legalName: {
    value: null,
    status: "REQUIRES_CONFIRMATION",
    source: null,
    lastUpdated: "2026-08-28",
  },
  phone: {
    value: "+250 784 111 206",
    status: "CONFIRMED",
    source: "official Zebra website, zebramotors.rw",
    lastUpdated: "2026-08-28",
  },
  email: {
    value: "info@zebramotor.rw",
    status: "CONFIRMED",
    source: "official Zebra website, zebramotors.rw",
    lastUpdated: "2026-08-28",
  },
  location: {
    value: "Kigali, Rwanda",
    status: "CONFIRMED",
    source: "official Zebra website, zebramotors.rw",
    lastUpdated: "2026-08-28",
  },
  whatsapp: {
    value: null,
    status: "REQUIRES_CONFIRMATION",
    source: null,
    lastUpdated: "2026-08-28",
    // Checked directly against zebramotors.rw on 2026-08-28: no WhatsApp
    // number or link appears anywhere on the site. Do not assume the phone
    // number above also takes WhatsApp messages until Zebra confirms it.
  },
  services: {
    value: {
      selfDrive: {
        value: true,
        status: "CONFIRMED",
        source: "official Zebra website lists daily, weekly, and monthly rentals",
        lastUpdated: "2026-08-28",
      },
      chauffeur: {
        value: null,
        status: "REQUIRES_CONFIRMATION",
        source: null,
        lastUpdated: "2026-08-28",
      },
      airportPickup: {
        value: null,
        status: "REQUIRES_CONFIRMATION",
        source: null,
        lastUpdated: "2026-08-28",
      },
    },
    status: "REQUIRES_CONFIRMATION",
    source: null,
    lastUpdated: "2026-08-28",
  },
  insurance: {
    value: null,
    status: "REQUIRES_CONFIRMATION",
    source: null,
    lastUpdated: "2026-08-28",
  },
  deposit: {
    value: null,
    status: "REQUIRES_CONFIRMATION",
    source: null,
    lastUpdated: "2026-08-28",
  },
  cancellation: {
    value: null,
    status: "REQUIRES_CONFIRMATION",
    source: null,
    lastUpdated: "2026-08-28",
  },
  paymentMethods: {
    value: null,
    status: "REQUIRES_CONFIRMATION",
    source: null,
    lastUpdated: "2026-08-28",
    // Card, mobile money (MTN MoMo, Airtel Money), and bank transfer are
    // being evaluated, none are confirmed live with a payment provider yet.
  },
  chauffeur: {
    value: {
      offered: null,
      rates: null,
      switchingPolicy: null,
      driverProfiles: null,
    },
    status: "REQUIRES_CONFIRMATION",
    source: null,
    lastUpdated: "2026-08-28",
  },
  airportPickup: {
    value: {
      offered: null,
      meetingPointProcess: null,
      nightArrivalPolicy: null,
      deliverySurcharge: null,
      airportReturn: null,
    },
    status: "REQUIRES_CONFIRMATION",
    source: null,
    lastUpdated: "2026-08-28",
  },
  roadsideAssistance: {
    value: null,
    status: "REQUIRES_CONFIRMATION",
    source: null,
    lastUpdated: "2026-08-28",
  },
  businessHours: {
    value: null,
    status: "REQUIRES_CONFIRMATION",
    source: null,
    lastUpdated: "2026-08-28",
  },
  documentsRequired: {
    value: {
      passport: true,
      homeDrivingLicence: true,
      internationalDrivingPermit: null,
    },
    status: "REQUIRES_CONFIRMATION",
    source: null,
    lastUpdated: "2026-08-28",
    // Passport and a home driving licence are always needed. Whether an
    // International Driving Permit is also required varies by nationality
    // and has not been confirmed against current Rwanda National Police
    // guidance, do not state a firm answer to customers either way.
  },
  fleet: {
    value: [
      { id: "kia-sorento", name: "KIA Sorento" },
      { id: "kia-k5", name: "KIA K5" },
      { id: "toyota-corolla", name: "Toyota Corolla" },
      { id: "toyota-altis", name: "Toyota Altis" },
    ],
    status: "CONFIRMED",
    source: "official Zebra website, zebramotors.rw, see data/vehicles.js for full specifications",
    lastUpdated: "2026-08-28",
  },
  reviews: {
    value: [
      { name: "Nicky" },
      { name: "BENEGUSENGA Samuel" },
      { name: "Jamal" },
    ],
    status: "CONFIRMED",
    source: "official Zebra website, zebramotors.rw, quoted verbatim, see scripts/seed.js",
    lastUpdated: "2026-08-28",
  },
};

// Convenience check used by pages/components deciding whether a value is
// safe to state as fact to a customer. Prefer this over reading `.status`
// directly so the rule stays in one place.
export function isConfirmed(field) {
  return field && field.status === "CONFIRMED" && field.value !== null;
}
