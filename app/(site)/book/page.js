import { Suspense } from "react";
import BookingFlow from "@/components/BookingFlow";
import { getVehicles } from "@/lib/db/vehicles";
import { getExtras } from "@/lib/db/extras";
import { getSettings } from "@/lib/db/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Book, Zebra Motors" };

export default async function BookPage() {
  const vehicles = await getVehicles();
  const extras = await getExtras({ activeOnly: true });
  const settings = await getSettings();

  return (
    <Suspense fallback={<div className="wrap" style={{ padding: 60 }}>Loading...</div>}>
      <BookingFlow vehicles={vehicles} extras={extras} settings={settings} />
    </Suspense>
  );
}
