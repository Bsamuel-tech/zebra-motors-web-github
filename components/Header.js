"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { telLink, whatsappLink } from "@/data/settings";

const LINKS = [
  { href: "/cars", label: "Fleet" },
  { href: "/chauffeur", label: "Chauffeur" },
  { href: "/airport-car-rental", label: "Airport Pickup" },
  { href: "/packages", label: "Packages" },
  { href: "/rwanda-guide", label: "Rwanda Guide" },
  { href: "/what-if", label: "What If" },
  { href: "/about", label: "About" },
];

// settings is passed down from app/(site)/layout.js, a server component
// that reads the real, admin-editable business_settings row (Phase 3B).
// This component stays a client component for the mobile menu's useState,
// so it cannot query the database itself.
export default function Header({ settings }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const waLink = whatsappLink({ settings });

  // Real signed-in state, not decorative: this link used to always say
  // "Sign in" even for a signed-in customer, because there was no real
  // customer session to check. Now there is (Section 7/8), so it checks
  // once on mount and reflects the actual account, name included.
  const [account, setAccount] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/customer-auth/me")
      .then((res) => (res.ok ? res.json() : { customer: null }))
      .then((data) => {
        if (!cancelled) setAccount(data.customer || null);
      })
      .catch(() => {
        if (!cancelled) setAccount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const accountLabel = account ? account.name.split(" ")[0] : "Sign in";
  const accountHref = account ? "/account" : "/login";

  return (
    <div>
      <div className="utility-bar">
        <div style={{ display: "flex", gap: 22 }}>
          <span>{settings.address}</span>
        </div>
        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          <a href={telLink(settings)} style={{ color: "inherit" }}>
            {settings.phoneDisplay}
          </a>
          {waLink && (
            <>
              <span style={{ width: 1, height: 12, background: "#4a4938" }} />
              <a href={waLink} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
                WhatsApp
              </a>
            </>
          )}
        </div>
      </div>
      <div className="main-nav">
        <Link href="/" className="logo">
          ZEBRA MOTORS
        </Link>
        <div className="links hide-mobile">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={pathname === l.href || pathname.startsWith(l.href + "/") ? "active" : ""}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <Link href={accountHref} className="hide-mobile" style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>
            {accountLabel}
          </Link>
          <Link href="/cars" className="btn-outline hide-mobile" style={{ padding: "10px 20px", fontSize: 13.5 }}>
            Find a Car
          </Link>
          <button
            type="button"
            className="menu-toggle show-mobile"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? (
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M4 4L18 18M18 4L4 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M3 6H19M3 11H19M3 16H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="mobile-menu">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className={pathname === l.href || pathname.startsWith(l.href + "/") ? "active" : ""}
            >
              {l.label}
            </Link>
          ))}
          <div className="mobile-menu-divider" />
          <a href={telLink(settings)}>{settings.phoneDisplay}</a>
          {waLink && (
            <a href={waLink} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          )}
          <div className="mobile-menu-divider" />
          <Link href={accountHref} onClick={() => setMenuOpen(false)}>
            {accountLabel}
          </Link>
          <Link href="/cars" className="btn-primary" style={{ textAlign: "center" }} onClick={() => setMenuOpen(false)}>
            Find a Car
          </Link>
        </div>
      )}
    </div>
  );
}
