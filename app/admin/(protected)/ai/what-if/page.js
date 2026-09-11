import { getVehicles } from "@/lib/db/vehicles";
import { getBookings } from "@/lib/db/bookings";
import { getWhatIfAnalyticsSummary } from "@/lib/db/whatIfSessions";
import { midRateRWF } from "@/data/vehicles";
import { hasSufficientHistory } from "@/lib/whatIf/businessSimulation";
import AdminWhatIfSimulator from "@/components/admin/AdminWhatIfSimulator";
import { getVehicleUtilization, getPopularDestinations, getAverageTripDistance } from "@/lib/db/businessAnalytics";

// Reads real, current fleet and booking data on every request, this is a
// simulation tool for admins, it must never work from a stale snapshot.
export const dynamic = "force-dynamic";

export default async function AdminWhatIfPage() {
  const vehicles = await getVehicles();
  const bookings = await getBookings();
  const realBookings = bookings.filter((b) => !b.isDemo);

  const fleetCount = vehicles.length;
  const rates = vehicles.map((v) => midRateRWF(v));
  const avgDailyRateRWF = fleetCount > 0 ? Math.round(rates.reduce((a, b) => a + b, 0) / fleetCount) : 0;
  const minDailyRateRWF = fleetCount > 0 ? Math.min(...vehicles.map((v) => v.dailyRateRWFMin)) : 0;
  const maxDailyRateRWF = fleetCount > 0 ? Math.max(...vehicles.map((v) => v.dailyRateRWFMax)) : 0;

  const baseline = {
    fleetCount,
    avgDailyRateRWF,
    minDailyRateRWF,
    maxDailyRateRWF,
    realBookingsCount: realBookings.length,
    hasSufficientHistory: hasSufficientHistory(realBookings.length),
  };

  const whatIfUsage = await getWhatIfAnalyticsSummary();
  const [vehicleUtilization, popularDestinations, averageTripDistance] = await Promise.all([
    getVehicleUtilization(),
    getPopularDestinations({ limit: 5 }),
    getAverageTripDistance(),
  ]);

  return (
    <div style={{ padding: "32px 36px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>AI What If, business simulation</h1>
      <p className="muted" style={{ fontSize: 13.5, marginBottom: 24, maxWidth: 680 }}>
        A calculator for exploring pricing and fleet decisions against Zebra&apos;s real current
        fleet data. This is not a chatbot and it does not predict what customers will actually do,
        every number below is labelled as an assumption you entered, an estimate calculated from
        real configured data, or a projection built from those assumptions.
      </p>

      <AdminWhatIfSimulator baseline={baseline} />

      <div className="card" style={{ padding: 20, marginTop: 30, maxWidth: 680 }}>
        <h2 style={{ fontSize: 15, marginBottom: 10 }}>Customer What If usage</h2>
        {whatIfUsage.totalSessions === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>
            No customer has used the What If explorer yet. This will fill in with real usage as
            visitors try it on the public site.
          </p>
        ) : (
          <>
            <p style={{ fontSize: 13.5, marginBottom: 10 }}>
              {whatIfUsage.totalSessions} scenario{whatIfUsage.totalSessions === 1 ? "" : "s"} explored,{" "}
              {whatIfUsage.continued} continued to booking.
            </p>
            {whatIfUsage.byVehicle.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {whatIfUsage.byVehicle.map((v) => (
                  <div key={v.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                    <span>{v.name}</span>
                    <span className="muted">{v.count} recommended</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="card" style={{ padding: 20, marginTop: 20, maxWidth: 680 }}>
        <h2 style={{ fontSize: 15, marginBottom: 4 }}>Business analyst (groundwork)</h2>
        <p className="muted" style={{ fontSize: 12, marginBottom: 14 }}>
          Real aggregate numbers, from real bookings and real Trip Planner selections, the same
          queries a future admin-facing AI assistant would call as tools, never a fabricated
          statistic.
        </p>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Vehicle utilization</div>
          {vehicleUtilization.every((v) => v.bookingCount === 0) ? (
            <p className="muted" style={{ fontSize: 12.5 }}>No real bookings yet, this will fill in as bookings come in.</p>
          ) : (
            vehicleUtilization.map((v) => (
              <div key={v.slug} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                <span>{v.name}</span>
                <span className="muted">{v.bookingCount} booking{v.bookingCount === 1 ? "" : "s"}, {v.bookedDays} days</span>
              </div>
            ))
          )}
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Popular destinations</div>
          {popularDestinations.every((d) => d.selections === 0) ? (
            <p className="muted" style={{ fontSize: 12.5 }}>No Trip Planner selections recorded yet.</p>
          ) : (
            popularDestinations.map((d) => (
              <div key={d.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                <span>{d.name}</span>
                <span className="muted">{d.selections} selection{d.selections === 1 ? "" : "s"}</span>
              </div>
            ))
          )}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Average trip distance</div>
          <p style={{ fontSize: 12.5 }}>
            {averageTripDistance.sampleSize > 0
              ? `${averageTripDistance.averageKm} km, averaged over ${averageTripDistance.sampleSize} booking${averageTripDistance.sampleSize === 1 ? "" : "s"} with a real routed distance.`
              : averageTripDistance.note}
          </p>
        </div>
      </div>
    </div>
  );
}
