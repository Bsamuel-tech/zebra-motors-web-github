import { getBookings, getMileageUsage } from "@/lib/db/bookings";
import { getVehicleByDbId } from "@/lib/db/vehicles";
import { formatRWF } from "@/data/vehicles";
import OdometerControl from "@/components/admin/OdometerControl";

export const dynamic = "force-dynamic";

// Real trip usage tracking (P3): every real (non-demo) booking, its
// vehicle's real mileage policy, and its real recorded odometer readings,
// compared honestly. Nothing here is estimated, a booking missing an
// odometer reading just shows "not recorded yet" rather than a guessed
// distance (Rule 2).
export default async function AdminTripsPage() {
  const allBookings = await getBookings();
  const bookings = allBookings.filter((b) => !b.isDemo);
  const rows = await Promise.all(
    bookings.map(async (b) => {
      const vehicle = await getVehicleByDbId(b.vehicleId);
      return { booking: b, vehicle, usage: getMileageUsage(b, vehicle) };
    })
  );

  return (
    <div style={{ padding: "32px 36px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Trips and mileage</h1>
      <p className="muted" style={{ fontSize: 13.5, marginBottom: 20, maxWidth: 680 }}>
        Real pickup and return odometer readings for each real booking, compared against that
        vehicle&apos;s mileage policy (set on the vehicle&apos;s own edit page). Distance shown here is
        only ever from an actual recorded reading, never estimated.
      </p>

      {rows.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <p className="muted">No real bookings yet, add one from the Bookings page to start tracking mileage.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {rows.map(({ booking, vehicle, usage }) => (
            <div key={booking.id} className="card" style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 600 }}>
                    {booking.bookingNumber} &middot; {booking.vehicleName || "Vehicle not found"}
                  </div>
                  <div className="muted" style={{ fontSize: 12.5 }}>
                    {booking.customerName || "No customer"}, {booking.pickupDate} to {booking.returnDate}
                  </div>
                </div>
                <span className="badge badge-muted" style={{ fontSize: 10.5 }}>
                  {vehicle?.mileagePolicyType === "DAILY_ALLOWANCE" && Number.isFinite(vehicle.includedKmPerDay)
                    ? `${vehicle.includedKmPerDay} km/day included`
                    : vehicle?.mileagePolicyType === "TOTAL_ALLOWANCE" && Number.isFinite(vehicle.includedTotalKm)
                    ? `${vehicle.includedTotalKm} km included`
                    : vehicle?.mileagePolicyType === "UNLIMITED" || !vehicle
                    ? "Unlimited mileage"
                    : "Mileage policy not fully configured"}
                </span>
              </div>

              <OdometerControl
                bookingId={booking.id}
                pickupOdometerKm={booking.pickupOdometerKm}
                returnOdometerKm={booking.returnOdometerKm}
              />

              <div style={{ marginTop: 12, fontSize: 13 }}>
                {!usage.available ? (
                  <span className="muted">{usage.reason}</span>
                ) : (
                  <div>
                    <span>Actual distance driven: {usage.actualKm} km</span>
                    {usage.policyType !== "UNLIMITED" && Number.isFinite(usage.allowedKm) && (
                      <>
                        {", "}
                        <span>allowed: {usage.allowedKm} km</span>
                        {usage.overageKm > 0 ? (
                          <span style={{ color: "#a33", fontWeight: 600 }}>
                            {" "}
                            &middot; {usage.overageKm} km over
                            {Number.isFinite(usage.overageCostRWF)
                              ? `, about RWF ${formatRWF(usage.overageCostRWF)} in extra-km charges`
                              : " (extra-km rate not set on this vehicle, so a cost cannot be calculated)"}
                          </span>
                        ) : (
                          <span style={{ color: "var(--forest-dark)" }}> &middot; within allowance</span>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
