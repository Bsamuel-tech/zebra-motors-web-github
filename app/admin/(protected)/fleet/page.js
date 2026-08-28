import Link from "next/link";
import { getVehicles } from "@/lib/db/vehicles";
import { formatRWF } from "@/data/vehicles";

export const dynamic = "force-dynamic";

const STATUS_COLORS = {
  AVAILABLE: "badge-forest",
  RESERVED: "badge-sand",
  RENTED: "badge-sand",
  MAINTENANCE: "badge-muted",
  UNAVAILABLE: "badge-muted",
  ARCHIVED: "badge-muted",
};

export default function AdminFleetPage() {
  const vehicles = getVehicles({ includeAll: true });

  return (
    <div style={{ padding: "32px 36px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>Fleet</h1>
          <p className="muted" style={{ fontSize: 13.5 }}>
            {vehicles.length} vehicles in the database. Changes here take effect on the public
            site immediately.
          </p>
        </div>
        <Link href="/admin/fleet/new" className="btn-primary">
          Add vehicle
        </Link>
      </div>

      <div className="card">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
              <th style={{ padding: "12px 16px" }}>Vehicle</th>
              <th style={{ padding: "12px 16px" }}>Category</th>
              <th style={{ padding: "12px 16px" }}>Daily rate</th>
              <th style={{ padding: "12px 16px" }}>Status</th>
              <th style={{ padding: "12px 16px" }}></th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => (
              <tr key={v.dbId} style={{ borderBottom: "1px solid var(--line)" }}>
                <td style={{ padding: "12px 16px" }}>
                  {v.name}
                  <div className="muted" style={{ fontSize: 12 }}>{v.year}</div>
                </td>
                <td style={{ padding: "12px 16px" }}>{v.category}</td>
                <td style={{ padding: "12px 16px" }}>
                  RWF {formatRWF(v.dailyRateRWFMin)} to {formatRWF(v.dailyRateRWFMax)}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span className={`badge ${STATUS_COLORS[v.status] || "badge-muted"}`}>{v.status}</span>
                </td>
                <td style={{ padding: "12px 16px", textAlign: "right" }}>
                  <Link href={`/admin/fleet/${v.dbId}`} style={{ fontSize: 13, fontWeight: 600 }}>
                    Edit →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
