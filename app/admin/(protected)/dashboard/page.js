import Link from "next/link";
import { getVehicles } from "@/lib/db/vehicles";
import { getReviews } from "@/lib/db/reviews";
import { getRecentAuditLog } from "@/lib/db/auditLog";

export const dynamic = "force-dynamic";

export default function AdminDashboard() {
  const vehicles = getVehicles({ includeAll: true });
  const reviews = getReviews();
  const auditLog = getRecentAuditLog(10);

  const byStatus = vehicles.reduce((acc, v) => {
    acc[v.status] = (acc[v.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ padding: "32px 36px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Dashboard</h1>
      <p className="muted" style={{ fontSize: 13.5, marginBottom: 28 }}>
        Real fleet and review data from the database. Bookings, payments, and revenue metrics
        are not shown here because the real booking and payment system has not been built yet
        (Phase 3D onward), showing numbers for those now would mean showing demo data as if it
        were real business performance, which this platform&apos;s own rules do not allow.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        <StatCard label="Total vehicles" value={vehicles.length} />
        <StatCard label="Available" value={byStatus.AVAILABLE || 0} />
        <StatCard label="In maintenance" value={byStatus.MAINTENANCE || 0} />
        <StatCard label="Archived" value={byStatus.ARCHIVED || 0} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ fontSize: 15 }}>Reviews awaiting attention</h2>
            <Link href="/admin/reviews" style={{ fontSize: 12.5, fontWeight: 600 }}>
              Manage →
            </Link>
          </div>
          <p style={{ fontSize: 13.5 }}>
            {reviews.length} total, {reviews.filter((r) => r.published).length} published
          </p>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ fontSize: 15 }}>Fleet</h2>
            <Link href="/admin/fleet" style={{ fontSize: 12.5, fontWeight: 600 }}>
              Manage →
            </Link>
          </div>
          <p style={{ fontSize: 13.5 }}>{vehicles.length} vehicles in the database</p>
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 15, marginBottom: 12 }}>Recent admin activity</h2>
        {auditLog.length === 0 ? (
          <p className="muted" style={{ fontSize: 13.5 }}>No admin actions recorded yet.</p>
        ) : (
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <tbody>
              {auditLog.map((entry) => (
                <tr key={entry.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ padding: "8px 6px", color: "var(--muted)", whiteSpace: "nowrap" }}>
                    {new Date(entry.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: "8px 6px" }}>{entry.user_name || "Unknown"}</td>
                  <td style={{ padding: "8px 6px" }}>
                    {entry.action} {entry.entity_type}
                  </td>
                  <td style={{ padding: "8px 6px", color: "var(--muted)" }}>{entry.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="card" style={{ padding: "18px 20px" }}>
      <div style={{ fontSize: 26, fontWeight: 600 }}>{value}</div>
      <div className="muted" style={{ fontSize: 12.5 }}>{label}</div>
    </div>
  );
}
