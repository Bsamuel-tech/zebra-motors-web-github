import ContactForm from "@/components/ContactForm";
import { getSettings } from "@/lib/db/settings";

export const dynamic = "force-dynamic";

export default function ContactPage() {
  const settings = getSettings();
  return <ContactForm settings={settings} />;
}
