"use client";

import { usePreferences } from "./PreferencesProvider";
import { SUPPORTED_LOCALES, LOCALE_LABELS } from "@/lib/i18n/dictionaries";

export default function LanguageSwitcher({ style }) {
  const { locale, setLocale } = usePreferences();
  return (
    <select
      aria-label="Language"
      value={locale}
      onChange={(e) => setLocale(e.target.value)}
      style={{
        background: "transparent",
        color: "inherit",
        border: "none",
        font: "inherit",
        cursor: "pointer",
        ...style,
      }}
    >
      {SUPPORTED_LOCALES.map((code) => (
        <option key={code} value={code} style={{ color: "#111" }}>
          {LOCALE_LABELS[code]}
        </option>
      ))}
    </select>
  );
}
