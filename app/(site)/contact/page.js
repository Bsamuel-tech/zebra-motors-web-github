import ContactForm from "@/components/ContactForm";
import { getSettings } from "@/lib/db/settings";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const settings = await getSettings();
  return <ContactForm settings={settings} />;
}
