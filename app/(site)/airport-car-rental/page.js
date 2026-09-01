import AirportBookingForm from "@/components/AirportBookingForm";
import { getSettings } from "@/lib/db/settings";

export const dynamic = "force-dynamic";

export default async function AirportPage() {
  const settings = await getSettings();
  return <AirportBookingForm settings={settings} />;
}
