import Link from "next/link";
import VehiclePhoto from "./VehiclePhoto";
import ConvertedPrice from "./ConvertedPrice";
import { formatRWF } from "@/data/vehicles";

export default function VehicleCard({ vehicle }) {
  return (
    <div className="card">
      <VehiclePhoto photos={vehicle.photos} height={160} />
      <div style={{ padding: 18 }}>
        <span className="badge badge-forest">{vehicle.badge}</span>
        <h3 style={{ fontSize: 18, margin: "10px 0 6px 0" }}>{vehicle.name}</h3>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 12 }}>
          {vehicle.year} · {vehicle.category} · {vehicle.seats} seats · {vehicle.transmission}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontSize: 13.5 }}>
            RWF {formatRWF(vehicle.dailyRateRWFMin)} to {formatRWF(vehicle.dailyRateRWFMax)}
            <span className="muted" style={{ fontSize: 12 }}>
              {" "}
              /day
            </span>
            <ConvertedPrice rwf={vehicle.dailyRateRWFMax} />
          </div>
          <Link href={`/cars/${vehicle.id}`} style={{ fontSize: 13, fontWeight: 600 }}>
            Details →
          </Link>
        </div>
      </div>
    </div>
  );
}
