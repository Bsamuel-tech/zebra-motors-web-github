"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { DICTIONARIES } from "@/lib/i18n/dictionaries";

const PreferencesContext = createContext(null);

function setCookie(name, value) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}`;
}

// Site-wide language and currency preference, initialized from the real
// cookie value the server already read (lib/prefsServer.js), so there is no
// flash of the wrong language on first paint, then held in React state so
// every client component under app/(site)/layout.js can react instantly
// without a full page reload. Both choices are display-only: the database
// itself, and every price actually charged, stays English/RWF, see
// lib/i18n/dictionaries.js and lib/currency.js for why.
export default function PreferencesProvider({
  initialLocale,
  initialCurrency,
  supportedCurrencies,
  currencyRates,
  children,
}) {
  const [locale, setLocaleState] = useState(initialLocale || "en");
  const [currency, setCurrencyState] = useState(initialCurrency || "RWF");

  const setLocale = useCallback((next) => {
    setLocaleState(next);
    setCookie("zebra_locale", next);
  }, []);

  const setCurrency = useCallback((next) => {
    setCurrencyState(next);
    setCookie("zebra_currency", next);
  }, []);

  const dict = DICTIONARIES[locale] || DICTIONARIES.en;

  return (
    <PreferencesContext.Provider
      value={{
        locale,
        setLocale,
        dict,
        currency,
        setCurrency,
        supportedCurrencies: supportedCurrencies?.length ? supportedCurrencies : ["RWF"],
        currencyRates: currencyRates || {},
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error("usePreferences() must be used within <PreferencesProvider>.");
  }
  return ctx;
}
