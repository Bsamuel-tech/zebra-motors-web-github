import Link from "next/link";
import { getAllMaintenanceRecords } from "@/lib/db/maintenance";

export const dynamic = "force-dynamic";

const STATUS_BADGE = {
  SCHEDULED: "badge-sand",
  IN_PROGRESS: "badge-ink",
  DONE: "badge-forest",
  CANCELLED: "badge-muted",
};

// Fleet-wide read view, real records only, joined from every vehicle.
// Adding or updating a record happens on that vehicle's own Fleet edit
// page, this page is for seeing the whole picture at once.
export default async function AdminMaintenancePage() {
  const records = await getAllMaintenanceRecords();

  return (
    <div style={{ padding: "32px 36px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Maintenance</h1>
      <p className="muted" style={{ fontSize: 13.5, marginBottom: 20, maxWidth: 640 }}>
        Every service and repair record across the fleet, entered by staff on each vehicle&apos;s
        own page in{" "}
        <Link href="/admin/fleet" style={{ fontWeight: 600 }}>
          Fleet
        </Link>
        . Nothing here is predicted or scheduled automatically.
      </p>

      {records.length === 0 ? (
        <p className="muted" style={{ fontSize: 13.5 }}>
          No maintenance records yet. Add one from a vehicle&apos;s edit page in Fleet.
        </p>
      ) : (
        <div className="card">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
                <th style={{ padding: "12px 16px" }}>Vehicle</th>
                <th style={{ padding: "12px 16px" }}>Type</th>
                <th style={{ padding: "12px 16px" }}>Description</th>
                <th style={{ padding: "12px 16px" }}>Scheduled</th>
                <th style={{ padding: "12px 16px" }}>Status</th>
                <th style={{ padding: "12px 16px" }}></th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600 }}>{r.vehicleName}</td>
                  <td style={{ padding: "12px 16px", textTransform: "capitalize" }}>{r.type}</td>
                  <td style={{ padding: "12px 16px", maxWidth: 300 }}>{r.description || "-"}</td>
                  <td style={{ padding: "12px 16px", color: "var(--muted)" }}>{r.scheduledDate || "-"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span className={`badge ${STATUS_BADGE[r.status] || "badge-muted"}`}>{r.status.replace("_", " ")}</span>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <Link href={`/admin/fleet/${r.vehicleId}`} style={{ fontSize: 12.5, fontWeight: 600 }}>
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
