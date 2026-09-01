import { getVehicles } from "@/lib/db/vehicles";
import BookingForm from "@/components/admin/BookingForm";

export const dynamic = "force-dynamic";

export default async function NewBookingPage() {
  const vehicles = await getVehicles({ includeAll: true });
  return (
    <div style={{ padding: "32px 36px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Add booking</h1>
      <p className="muted" style={{ fontSize: 13.5, marginBottom: 20, maxWidth: 600 }}>
        For a real booking Zebra staff took by phone or in person, saved directly as a real
        booking, not the labelled public demo flow.
      </p>
      <BookingForm vehicles={vehicles} />
    </div>
  );
}
