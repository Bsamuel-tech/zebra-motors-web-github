"use client";

import { usePreferences } from "./PreferencesProvider";

// Only ever offers RWF plus a currency Zebra has both switched on
// (business_settings.supported_currencies) AND given a real rate for
// (currency_rates, see /admin/settings), never a currency that would
// silently fail to convert. RWF always appears first since it is the one
// real, charged currency, every other option is an estimate (see
// components/ConvertedPrice.js).
export default function CurrencySwitcher({ style }) {
  const { currency, setCurrency, supportedCurrencies, currencyRates } = usePreferences();
  const options = ["RWF", ...supportedCurrencies.filter((c) => c !== "RWF" && currencyRates?.[c])];

  if (options.length <= 1) return null;

  return (
    <select
      aria-label="Currency"
      value={currency}
      onChange={(e) => setCurrency(e.target.value)}
      style={{
        background: "transparent",
        color: "inherit",
        border: "none",
        font: "inherit",
        cursor: "pointer",
        ...style,
      }}
    >
      {options.map((code) => (
        <option key={code} value={code} style={{ color: "#111" }}>
          {code}
        </option>
      ))}
    </select>
  );
}
