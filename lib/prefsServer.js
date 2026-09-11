// Server-only. Reads the visitor's saved language/currency choice (set by
// components/PreferencesProvider.js via a plain, non-httpOnly cookie, there
// is no account-level preference to read instead) so the first server-
// rendered response already matches what they picked last time, instead of
// flashing English/RWF for a moment before the client corrects it.
import { cookies } from "next/headers";
import { SUPPORTED_LOCALES } from "./i18n/dictionaries";

export function getInitialLocale() {
  const value = cookies().get("zebra_locale")?.value;
  return SUPPORTED_LOCALES.includes(value) ? value : "en";
}

export function getInitialCurrency(defaultCurrency, supportedCurrencies) {
  const value = cookies().get("zebra_currency")?.value;
  if (value && Array.isArray(supportedCurrencies) && supportedCurrencies.includes(value)) {
    return value;
  }
  return defaultCurrency || "RWF";
}
