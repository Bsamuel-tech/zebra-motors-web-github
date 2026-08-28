import Link from "next/link";
import TripPlanner from "@/components/TripPlanner";
import { getVehicles } from "@/lib/db/vehicles";

// Server component: reads the real fleet from the database (Phase 3B) and
// hands it to the interactive trip planner.
export const dynamic = "force-dynamic";

export default function PlanTripPage() {
  const vehicles = getVehicles();
  return (
    <div>
      <TripPlanner vehicles={vehicles} />
      <div className="wrap" style={{ padding: "0 32px 60px 32px" }}>
        <div className="card" style={{ padding: 18, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Prefer to describe your trip instead of using sliders?</div>
            <p className="muted" style={{ fontSize: 12.5 }}>
              Zebra AI What If reads a written scenario and checks it against the same real fleet
              and pricing.
            </p>
          </div>
          <Link href="/what-if" className="btn-outline" style={{ padding: "9px 18px", fontSize: 13, whiteSpace: "nowrap" }}>
            Try Zebra AI What If
          </Link>
        </div>
      </div>
    </div>
  );
}
