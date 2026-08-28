import AirportBookingForm from "@/components/AirportBookingForm";
import { getSettings } from "@/lib/db/settings";

export const dynamic = "force-dynamic";

export default function AirportPage() {
  const settings = getSettings();
  return <AirportBookingForm settings={settings} />;
}
