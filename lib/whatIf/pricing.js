// ---------------------------------------------------------------------------
// WHAT IF: PRICING
// ---------------------------------------------------------------------------
// Every number here comes from the vehicle's real configured daily rate
// range (data/vehicles.js / the vehicles table) or from businessConfirmation
// status. Nothing is invented. Chauffeur and airport fees are only ever
// shown as a number if businessConfirmation marks them CONFIRMED, which
// they are not yet, so today this always returns the honest "not
// configured, contact Zebra" message for those two, see
// data/businessConfirmation.js.
// ---------------------------------------------------------------------------

import { formatRWF, midRateRWF } from "@/data/vehicles";
import { businessConfirmation, isConfirmed } from "@/data/businessConfirmation";

export function estimateRental(vehicle, days) {
  const d = days && days > 0 ? days : 1;
  return {
    minRWF: vehicle.dailyRateRWFMin * d,
    maxRWF: vehicle.dailyRateRWFMax * d,
    minLabel: `RWF ${formatRWF(vehicle.dailyRateRWFMin * d)}`,
    maxLabel: `RWF ${formatRWF(vehicle.dailyRateRWFMax * d)}`,
    midRWF: midRateRWF(vehicle) * d,
    days: d,
    note: "Estimated from the configured daily price range. This is not a confirmed quotation.",
  };
}

export function chauffeurPricing() {
  const conf = businessConfirmation.chauffeur;
  if (isConfirmed(conf) && conf.value?.rates) {
    return { configured: true, value: conf.value.rates };
  }
  return {
    configured: false,
    message: "Chauffeur pricing is not currently configured. Contact Zebra Motors for a quote.",
  };
}

export function airportPricing() {
  const conf = businessConfirmation.airportPickup;
  if (isConfirmed(conf) && conf.value?.deliverySurcharge) {
    return { configured: true, value: conf.value.deliverySurcharge };
  }
  return {
    configured: false,
    message: "Airport pickup pricing is not currently configured. Contact Zebra Motors for a quote.",
  };
}
