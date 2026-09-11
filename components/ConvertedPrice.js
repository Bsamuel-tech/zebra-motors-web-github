"use client";

import { usePreferences } from "./PreferencesProvider";
import { convertedEstimateLabel } from "@/lib/currency";

// Renders a small "~ 31 USD" style estimate right after a real RWF price,
// using the visitor's selected currency (components/CurrencySwitcher.js)
// and Zebra's own admin-entered rate (/admin/settings). Renders nothing at
// all when RWF is selected or no real rate exists for the chosen currency,
// this is only ever an added convenience, never a replacement for the real
// RWF number next to it.
export default function ConvertedPrice({ rwf, style }) {
  const { currency, currencyRates } = usePreferences();
  const label = convertedEstimateLabel(rwf, currency, currencyRates);
  if (!label) return null;
  return (
    <span className="muted" style={{ fontSize: 12, marginLeft: 6, ...style }}>
      {label}
    </span>
  );
}
