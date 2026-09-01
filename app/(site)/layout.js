import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getSettings } from "@/lib/db/settings";

// Forces every route nested under this layout to render per request rather
// than being frozen into a static build-time snapshot. Business settings
// are now admin-editable (Rule 84), a contact number changed in
// /admin/settings must show up on every page, including ones like /about
// that have no dynamic data of their own.
export const dynamic = "force-dynamic";

// Server component: reads the real BusinessSettings row from the database
// (Phase 3B) once per request and passes it down as a plain prop. Header is
// a client component ("use client", it needs useState for the mobile menu)
// so it cannot query the database itself, this is why settings travels in
// as a prop instead of being imported directly the way the old
// /data/settings.js static file was.
// Structured data (Section 3E, SEO) built only from fields the business
// has actually confirmed (Rule 2 and Rule 3's real seed data): company
// name, phone, email, city, and country. Fields still marked "NOT YET
// CONFIRMED" in business_settings (legal name, business hours, emergency
// phone) are deliberately left out here, publishing that literal string
// into search-engine-facing markup would be worse than omitting it.
function localBusinessJsonLd(settings) {
  return {
    "@context": "https://schema.org",
    "@type": "AutoRental",
    name: settings.companyName,
    telephone: settings.phone,
    email: settings.email,
    url: "https://zebramotors.rw",
    address: {
      "@type": "PostalAddress",
      addressLocality: settings.city,
      addressCountry: settings.country,
    },
  };
}

export default async function SiteLayout({ children }) {
  const settings = await getSettings();
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd(settings)) }}
      />
      <Header settings={settings} />
      <main>{children}</main>
      <Footer settings={settings} />
    </>
  );
}
