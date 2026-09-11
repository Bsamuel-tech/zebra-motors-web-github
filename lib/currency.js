// ---------------------------------------------------------------------------
// CURRENCY CONVERSION (display only)
// ---------------------------------------------------------------------------
// RWF is, and stays, the only real, charged currency (see prisma/schema.sql,
// bookings.total_rwf). Everything here converts a real RWF amount into an
// estimate in another currency for a visitor's convenience, using the real
// rate an admin entered at /admin/settings (business_settings.currency_rates,
// see lib/db/settings.js). Nothing here invents a rate: a currency with no
// admin-entered rate simply cannot be converted, callers must check for that
// and fall back to showing RWF only, never a guessed number.
//
// No "use client"/"use server" directive: this is a plain, pure module safe
// to import from either side, exactly like data/vehicles.js.
// ---------------------------------------------------------------------------

// rates: { [currencyCode]: rwfPerUnit }, e.g. { USD: 1300, EUR: 1200 }.
// Returns null (never a guessed number) when the currency is RWF itself, or
// has no real rate on file.
export function convertFromRWF(amountRWF, currencyCode, rates) {
  if (!Number.isFinite(amountRWF)) return null;
  if (!currencyCode || currencyCode === "RWF") return null;
  const rate = rates?.[currencyCode];
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return amountRWF / rate;
}

// Uses Intl's own real currency formatting rules (symbol, decimal places,
// grouping) rather than a hand-rolled format, so this is correct for
// currencies with different conventions (e.g. JPY has no decimals) without
// this file needing to know that itself. Falls back to a plain "<code>
// <number>" string on an unrecognized code rather than throwing.
export function formatMoney(amount, currencyCode) {
  if (!Number.isFinite(amount)) return null;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currencyCode} ${Math.round(amount).toLocaleString()}`;
  }
}

// Convenience: real RWF amount -> a converted, formatted estimate string, or
// null if it cannot be honestly computed (see convertFromRWF above).
export function convertedEstimateLabel(amountRWF, currencyCode, rates) {
  const converted = convertFromRWF(amountRWF, currencyCode, rates);
  if (converted === null) return null;
  const formatted = formatMoney(converted, currencyCode);
  return formatted ? `~ ${formatted}` : null;
}
