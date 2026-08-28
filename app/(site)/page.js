import Link from "next/link";
import Photo from "@/components/Photo";
import VehicleCard from "@/components/VehicleCard";
import { getVehicles } from "@/lib/db/vehicles";
import { getReviews } from "@/lib/db/reviews";
import { recordPageView } from "@/lib/db/analytics";

// The homepage reads live fleet, review, and (via the layout) settings data
// from the database (Phase 3B). Without this, Next.js would prerender it
// once at build time and keep serving that snapshot in production,
// admin edits would silently stop showing up on the public site.
export const dynamic = "force-dynamic";

// Real reviews, originally fetched verbatim from zebramotors.rw and now
// stored in the reviews table (Phase 3B), moderated from /admin/reviews.
// Text and star ratings are exact quotes, not edited to sound better, per
// the platform's rule against modifying reviews. No "verified rental"
// badge is shown because there is no booking-linked verification yet. No
// country or date is shown because the source page does not list either,
// and neither is invented here.

export default function HomePage() {
  recordPageView("/");
  const featured = getVehicles();
  const REVIEWS = getReviews({ publishedOnly: true });

  return (
    <div>
      {/* hero */}
      <div style={{ position: "relative", height: 560 }}>
        <Photo height="100%" />
        {/* Photography brief (internal, not shown to customers): a real
            Zebra vehicle on the Kigali to Musanze road, golden hour. Replace
            this placeholder once real photography is available. */}
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
            <h1 style={{ color: "#fff", fontSize: 44, lineHeight: 1.15, marginBottom: 16 }}>
              Professional car rental and mobility services in Rwanda.
            </h1>
            <p style={{ color: "#edeae0", fontSize: 16, lineHeight: 1.6, maxWidth: 500, marginBottom: 26 }}>
              Self-drive, or ask about a professional driver. Share your flight details and Zebra
              will help plan your Kigali pickup. Browse the fleet and published pricing, then
              confirm your booking directly with Zebra.
            </p>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <Link href="/cars" className="btn-primary">
                Find a Car
              </Link>
              <Link href="/plan-your-trip" className="btn-secondary">
                Plan My Rwanda Trip
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* trust strip */}
      <div className="wrap" style={{ display: "flex", justifyContent: "center", gap: 40, flexWrap: "wrap", padding: "28px 32px" }}>
        {[
          "Kigali-based, in-person handover",
          "Real customer reviews",
          "Phone support",
          "Self-drive, driver available on request",
        ].map((t) => (
          <div key={t} style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <svg width="16" height="16" fill="none" stroke="#2F5D46" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M20 7l-9 9-5-5" />
            </svg>
            <span style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>{t}</span>
          </div>
        ))}
      </div>

      {/* featured fleet */}
      <div className="section" style={{ background: "#fff", borderTop: "1px solid var(--line)" }}>
        <div className="wrap">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 30, flexWrap: "wrap", gap: 12 }}>
            <div>
              <p className="eyebrow">The fleet</p>
              <h2 style={{ fontSize: 30 }}>Choose the right vehicle for your trip</h2>
            </div>
            <Link href="/cars" style={{ fontSize: 14.5, fontWeight: 600 }}>
              View all vehicles →
            </Link>
          </div>
          <div className="grid-4">
            {featured.map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>
          <p className="muted" style={{ fontSize: 11.5, marginTop: 16 }}>
            Pricing shown is Zebra&apos;s currently published daily rate range in RWF, the
            currency Zebra invoices in.
          </p>
        </div>
      </div>

      {/* how it works */}
      <div className="section" style={{ background: "var(--paper-alt)" }}>
        <div className="wrap">
          <p className="eyebrow">How it works</p>
          <h2 style={{ fontSize: 28, marginBottom: 34 }}>From browsing to driving, in four steps</h2>
          <div className="grid-4">
            {[
              ["01", "Choose your vehicle & dates", "Filter by seats, luggage, terrain and budget, or let the trip planner suggest one."],
              ["02", "Request your booking", "Share your dates and details. Zebra confirms availability, pricing, and deposit directly with you."],
              ["03", "Pick up in Kigali or at the airport", "Share your flight details so Zebra can plan to meet you."],
              ["04", "Travel with support on call", "A real person on the phone for the length of your trip."],
            ].map(([n, t, d]) => (
              <div key={n}>
                <div className="serif" style={{ fontSize: 34, color: "var(--forest-dark)", marginBottom: 8 }}>
                  {n}
                </div>
                <h3 style={{ fontSize: 17, marginBottom: 6 }}>{t}</h3>
                <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.6 }}>
                  {d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* trip planner teaser */}
      <div style={{ padding: "56px 32px", background: "var(--ink)" }}>
        <div className="wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 24 }}>
          <div style={{ maxWidth: 540 }}>
            <p className="eyebrow" style={{ color: "#b9e0c8" }}>
              Zebra Travel Assistant
            </p>
            <h2 style={{ fontSize: 26, color: "#fff", marginBottom: 10 }}>
              Not sure what you need? Tell us about your trip.
            </h2>
            <p style={{ fontSize: 14, color: "#c9c6b6", lineHeight: 1.6 }}>
              &ldquo;8 days, my wife and I, Kigali, Akagera and Lake Kivu&rdquo;: get a suggested
              itinerary and the right vehicle for it in under a minute.
            </p>
          </div>
          <Link href="/plan-your-trip" className="btn-secondary">
            Plan My Rwanda Trip →
          </Link>
        </div>
      </div>

      {/* what if teaser, deliberately modest: a real customer feature, not the
          center of the homepage */}
      <div className="wrap" style={{ padding: "0 32px 8px 32px" }}>
        <div
          className="card"
          style={{
            padding: "18px 22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 2 }}>
              Not sure which vehicle fits your plans?
            </div>
            <p className="muted" style={{ fontSize: 12.5 }}>
              Describe a scenario in your own words and see a fleet match, checked against real
              pricing and availability.
            </p>
          </div>
          <Link href="/what-if" className="btn-outline" style={{ padding: "9px 18px", fontSize: 13, whiteSpace: "nowrap" }}>
            Try Zebra AI What If
          </Link>
        </div>
      </div>

      {/* reviews */}
      <div className="section">
        <div className="wrap">
          <p className="eyebrow">Customer reviews</p>
          <h2 style={{ fontSize: 28, marginBottom: 30 }}>What customers say</h2>
          <div className="grid-3">
            {REVIEWS.map((r) => (
              <div className="card" key={r.name} style={{ padding: 22 }}>
                <div style={{ marginBottom: 12 }}>
                  <span style={{ color: "var(--sand)", letterSpacing: 2 }}>
                    {"★".repeat(r.stars)}
                    {"☆".repeat(5 - r.stars)}
                  </span>
                </div>
                <p style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.6, marginBottom: 14 }}>
                  &ldquo;{r.text}&rdquo;
                </p>
                <div className="muted" style={{ fontSize: 12.5 }}>{r.name}</div>
              </div>
            ))}
          </div>
          <p className="muted" style={{ fontSize: 11.5, marginTop: 20 }}>
            Reviews shown are quoted as published on zebramotors.rw.
          </p>
        </div>
      </div>
    </div>
  );
}
