import { getVehicles } from "@/lib/db/vehicles";
import { getBookings } from "@/lib/db/bookings";
import { getWhatIfAnalyticsSummary } from "@/lib/db/whatIfSessions";
import { midRateRWF } from "@/data/vehicles";
import { hasSufficientHistory } from "@/lib/whatIf/businessSimulation";
import AdminWhatIfSimulator from "@/components/admin/AdminWhatIfSimulator";

// Reads real, current fleet and booking data on every request, this is a
// simulation tool for admins, it must never work from a stale snapshot.
export const dynamic = "force-dynamic";

export default function AdminWhatIfPage() {
  const vehicles = getVehicles();
  const bookings = getBookings();
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

  const whatIfUsage = getWhatIfAnalyticsSummary();

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
    </div>
  );
}
