"use client";

import Link from "next/link";
import { telLink, mailtoLink } from "@/data/settings";
import { usePreferences } from "./PreferencesProvider";

// settings is passed down from app/(site)/layout.js, a server component
// reading the real business_settings row (Phase 3B). Labels come from
// usePreferences()'s dict (lib/i18n/dictionaries.js), a client-side context,
// which is why this is now a client component itself; the real contact
// data in `settings` still arrives as a plain server-provided prop either
// way.
export default function Footer({ settings }) {
  const { dict, currency } = usePreferences();
  const t = dict.footer;
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div>
          <div className="serif" style={{ fontSize: 21, color: "#fff", marginBottom: 12 }}>
            ZEBRA MOTORS
          </div>
          <p style={{ fontSize: 13.5, color: "#b4b09b", lineHeight: 1.6, maxWidth: 280 }}>{t.tagline}</p>
        </div>
        <div>
          <div className="col-title">{t.servicesTitle}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Link href="/cars">{t.selfDrive}</Link>
            <Link href="/chauffeur">{t.chauffeurService}</Link>
            <Link href="/airport-car-rental">{t.airportPickup}</Link>
            <Link href="/packages">{t.travelPackages}</Link>
          </div>
        </div>
        <div>
          <div className="col-title">{t.supportTitle}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Link href="/faq">{t.faq}</Link>
            <Link href="/insurance">{t.insurance}</Link>
            <Link href="/terms">{t.terms}</Link>
            <Link href="/privacy">{t.privacy}</Link>
          </div>
        </div>
        <div>
          <div className="col-title">{t.contactTitle}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, color: "#d9d4c2", fontSize: 14 }}>
            <a href={telLink(settings)} style={{ color: "inherit" }}>
              {settings.phoneDisplay}
            </a>
            <a href={mailtoLink(settings)} style={{ color: "inherit" }}>
              {settings.email}
            </a>
            <span>{settings.address}</span>
          </div>
        </div>
      </div>
      <div
        className="wrap"
        style={{
          borderTop: "1px solid #3a3928",
          paddingTop: 22,
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 12.5, color: "#8c8873" }}>{t.rights}</span>
        <span style={{ fontSize: 12.5, color: "#8c8873" }}>
          {t.pricesShownIn} {settings.defaultCurrency}
          {currency !== "RWF" ? `, converted estimates shown in ${currency}` : ""}.
        </span>
      </div>
    </footer>
  );
}
