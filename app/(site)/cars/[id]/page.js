import Link from "next/link";
import { notFound } from "next/navigation";
import VehiclePhoto from "@/components/VehiclePhoto";
import { formatRWF, priceRangeLabel, weeklyRateRWF, monthlyRateRWF } from "@/data/vehicles";
import { getVehicleBySlug } from "@/lib/db/vehicles";
import { recordPageView } from "@/lib/db/analytics";

// Dynamically rendered per request (reads the database), no
// generateStaticParams here since the fleet is now admin-editable and can
// change without a rebuild, per Rule 84.
export const dynamic = "force-dynamic";

export function generateMetadata({ params }) {
  const vehicle = getVehicleBySlug(params.id);
  if (!vehicle) return {};
  return {
    title: `${vehicle.name}, Zebra Motors`,
    description: vehicle.description,
  };
}

export default function VehicleDetailPage({ params }) {
  const vehicle = getVehicleBySlug(params.id);
  if (!vehicle) notFound();
  recordPageView(`/cars/${vehicle.id}`, vehicle.dbId);

  return (
    <div className="wrap" style={{ paddingTop: 26, paddingBottom: 70 }}>
      <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
        Home / Fleet / {vehicle.name}
      </div>

      <div style={{ display: "flex", gap: 36, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 560px", minWidth: 300 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10, marginBottom: 30 }}>
            <VehiclePhoto photos={vehicle.photos} index={0} height={360} />
            <div style={{ display: "grid", gridTemplateRows: "1fr 1fr 1fr", gap: 10 }}>
              <VehiclePhoto photos={vehicle.photos} index={1} height={113} />
              <VehiclePhoto photos={vehicle.photos} index={2} height={113} />
              <VehiclePhoto
                photos={vehicle.photos}
                index={3}
                height={113}
                caption={vehicle.photos.length > 4 ? `+${vehicle.photos.length - 4} more` : undefined}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <div>
              <span className="badge badge-forest">{vehicle.badge}</span>
              <h1 style={{ fontSize: 30, margin: "10px 0 4px 0" }}>{vehicle.name}</h1>
              <div className="muted" style={{ fontSize: 13.5 }}>
                {vehicle.year} · {vehicle.category} · {vehicle.doors} doors
              </div>
            </div>
          </div>

          <div className="card" style={{ display: "flex", flexWrap: "wrap", marginBottom: 30 }}>
            {[
              [vehicle.seats + " seats"],
              [vehicle.transmission],
              [vehicle.fuel],
              [vehicle.drive],
              [vehicle.luggage],
              [vehicle.ac ? "A/C" : "No A/C"],
            ].map(([label], i) => (
              <div
                key={i}
                style={{
                  flex: "1 1 140px",
                  textAlign: "center",
                  padding: "14px 8px",
                  borderRight: i < 5 ? "1px solid var(--line)" : "none",
                  fontSize: 12.5,
                  color: "var(--ink-soft)",
                }}
              >
                {label}
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 20, marginBottom: 14 }}>Why this vehicle</h2>
          <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "var(--ink-soft)", maxWidth: 620, marginBottom: 30 }}>
            {vehicle.description}
          </p>

          <h2 style={{ fontSize: 20, marginBottom: 14 }}>Rental terms</h2>
          <div className="card confirm-note" style={{ display: "block", marginBottom: 30, fontSize: 13.5, lineHeight: 1.6 }}>
            Mileage allowance, fuel policy, and cancellation terms will be confirmed directly with
            Zebra Motors when you book.
          </div>

          <h2 style={{ fontSize: 20, marginBottom: 14 }}>Insurance &amp; deposit</h2>
          <div className="card confirm-note" style={{ display: "block", marginBottom: 30, fontSize: 13.5, lineHeight: 1.6 }}>
            Insurance coverage and the required security deposit will be confirmed directly with
            Zebra Motors before your booking is finalized.
          </div>

          <div className="card" style={{ padding: 18, marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>What if you chose a different vehicle?</div>
              <p className="muted" style={{ fontSize: 12.5 }}>
                Compare the {vehicle.name} against another vehicle for your exact trip.
              </p>
            </div>
            <Link
              href={`/what-if?text=${encodeURIComponent(`What if I choose the ${vehicle.name} for my trip?`)}`}
              className="btn-outline"
              style={{ padding: "9px 18px", fontSize: 13, whiteSpace: "nowrap" }}
            >
              Try Zebra AI What If
            </Link>
          </div>
        </div>

        {/* booking sidebar */}
        <div style={{ width: 340, flexShrink: 0 }}>
          <div className="card" style={{ padding: 22, position: "sticky", top: 20 }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{priceRangeLabel(vehicle)}</div>
            <div className="muted" style={{ fontSize: 12.5, marginBottom: 18 }}>
              ≈ RWF {formatRWF(weeklyRateRWF(vehicle))}/week · ≈ RWF {formatRWF(monthlyRateRWF(vehicle))}/month
              (illustrative, not yet confirmed pricing)
            </div>
            <Link
              href={`/book?vehicle=${vehicle.id}`}
              className="btn-primary"
              style={{ width: "100%", textAlign: "center", display: "block" }}
            >
              Continue to book
            </Link>
            <div className="muted" style={{ textAlign: "center", fontSize: 12, marginTop: 10 }}>
              Final price and terms confirmed with Zebra Motors before payment
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
