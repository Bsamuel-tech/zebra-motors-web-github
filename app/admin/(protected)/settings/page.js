import { getSettings } from "@/lib/db/settings";
import SettingsForm from "@/components/admin/SettingsForm";

export const dynamic = "force-dynamic";

export default function AdminSettingsPage() {
  const settings = getSettings();

  return (
    <div style={{ padding: "32px 36px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Business settings</h1>
      <p className="muted" style={{ fontSize: 13.5, marginBottom: 20 }}>
        The single source of truth for contact and company details (Rule 6). The header,
        footer, contact page, and airport pickup page all read this same record.
      </p>
      <SettingsForm settings={settings} />
    </div>
  );
}
