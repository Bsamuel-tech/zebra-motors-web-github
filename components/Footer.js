import Link from "next/link";
import { telLink, mailtoLink } from "@/data/settings";

// settings is passed down from app/(site)/layout.js, a server component
// reading the real business_settings row (Phase 3B).
export default function Footer({ settings }) {
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div>
          <div className="serif" style={{ fontSize: 21, color: "#fff", marginBottom: 12 }}>
            ZEBRA MOTORS
          </div>
          <p style={{ fontSize: 13.5, color: "#b4b09b", lineHeight: 1.6, maxWidth: 280 }}>
            Car rental and mobility services based in Kigali, Rwanda, serving local, diaspora and
            international customers.
          </p>
        </div>
        <div>
          <div className="col-title">Services</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Link href="/cars">Self-drive rental</Link>
            <Link href="/chauffeur">Chauffeur service</Link>
            <Link href="/airport-car-rental">Airport pickup</Link>
            <Link href="/packages">Travel packages</Link>
          </div>
        </div>
        <div>
          <div className="col-title">Support</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Link href="/faq">FAQ</Link>
            <Link href="/insurance">Insurance</Link>
            <Link href="/terms">Terms &amp; conditions</Link>
            <Link href="/privacy">Privacy policy</Link>
          </div>
        </div>
        <div>
          <div className="col-title">Contact</div>
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
        <span style={{ fontSize: 12.5, color: "#8c8873" }}>© 2026 Zebra Motors. All rights reserved.</span>
        <span style={{ fontSize: 12.5, color: "#8c8873" }}>Prices shown in {settings.defaultCurrency}.</span>
      </div>
    </footer>
  );
}
