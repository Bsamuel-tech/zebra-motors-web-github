import { getSettings } from "@/lib/db/settings";
import SettingsForm from "@/components/admin/SettingsForm";
import CurrencyRatesForm from "@/components/admin/CurrencyRatesForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <div style={{ padding: "32px 36px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Business settings</h1>
      <p className="muted" style={{ fontSize: 13.5, marginBottom: 20 }}>
        The single source of truth for contact and company details (Rule 6). The header,
        footer, contact page, and airport pickup page all read this same record.
      </p>
      <SettingsForm settings={settings} />

      <h2 style={{ fontSize: 19, margin: "36px 0 4px 0" }}>Currency conversion</h2>
      <p className="muted" style={{ fontSize: 13.5, marginBottom: 20 }}>
        Every price actually charged stays in RWF. Rates entered here only add a converted
        estimate next to the RWF price and populate the currency switcher in the header.
      </p>
      <CurrencyRatesForm settings={settings} />

      <h2 style={{ fontSize: 19, margin: "36px 0 4px 0" }}>Languages</h2>
      <p className="muted" style={{ fontSize: 13.5, marginBottom: 20, maxWidth: 640 }}>
        The header, footer, and homepage are available in English, French, and Kinyarwanda
        (switch with the language selector in the header). Page content an admin writes
        directly, vehicle descriptions, FAQ answers, Rwanda Guide articles, and knowledge base
        articles, is only ever published in the language it was written in, nothing here is
        auto-translated, per the platform&apos;s rule against inventing content Zebra never
        actually wrote.
      </p>
    </div>
  );
}
