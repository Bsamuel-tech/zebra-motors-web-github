import { Suspense } from "react";
import BookingFlow from "@/components/BookingFlow";
import { getVehicles } from "@/lib/db/vehicles";
import { getExtras } from "@/lib/db/extras";

export const dynamic = "force-dynamic";
export const metadata = { title: "Book, Zebra Motors" };

export default function BookPage() {
  const vehicles = getVehicles();
  const extras = getExtras({ activeOnly: true });

  return (
    <Suspense fallback={<div className="wrap" style={{ padding: 60 }}>Loading...</div>}>
      <BookingFlow vehicles={vehicles} extras={extras} />
    </Suspense>
  );
}
