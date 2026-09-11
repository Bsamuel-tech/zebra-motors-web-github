"use client";

import Link from "next/link";
import Photo from "@/components/Photo";
import { usePreferences } from "./PreferencesProvider";

// Translated hero + trust strip (lib/i18n/dictionaries.js), split out from
// app/(site)/page.js so the rest of the homepage (fleet, real reviews) can
// stay a plain server component reading straight from the database.
export default function HomeHero() {
  const { dict } = usePreferences();
  const t = dict.hero;
  return (
    <>
      <div style={{ position: "relative", height: 560 }}>
        <Photo height="100%" />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(15,14,8,.62) 0%, rgba(15,14,8,.28) 46%, rgba(15,14,8,.12) 100%)",
          }}
        />
        <div className="wrap" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", paddingBottom: 64 }}>
          <div style={{ maxWidth: 620 }}>
            <h1 style={{ color: "#fff", fontSize: 44, lineHeight: 1.15, marginBottom: 16 }}>{t.headline}</h1>
            <p style={{ color: "#edeae0", fontSize: 16, lineHeight: 1.6, maxWidth: 500, marginBottom: 26 }}>{t.subhead}</p>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <Link href="/cars" className="btn-primary">
                {t.ctaFindCar}
              </Link>
              <Link href="/plan-your-trip" className="btn-secondary">
                {t.ctaPlanTrip}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="wrap" style={{ display: "flex", justifyContent: "center", gap: 40, flexWrap: "wrap", padding: "28px 32px" }}>
        {t.trust.map((item) => (
          <div key={item} style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <svg width="16" height="16" fill="none" stroke="#2F5D46" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M20 7l-9 9-5-5" />
            </svg>
            <span style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>{item}</span>
          </div>
        ))}
      </div>
    </>
  );
}
