import Link from "next/link";
import { getDestinations } from "@/lib/db/destinations";
import { getCustomDestinationRequests } from "@/lib/db/destinations";

export const dynamic = "force-dynamic";

const CATEGORY_BADGE = {
  CITY: "badge-ink",
  NATIONAL_PARK: "badge-forest",
  LAKE: "badge-forest",
  MOUNTAIN: "badge-forest",
  AIRPORT: "badge-sand",
  HOTEL: "badge-sand",
  ATTRACTION: "badge-sand",
  CUSTOM: "badge-muted",
};

export default async function AdminDestinationsPage() {
  const destinations = await getDestinations({ publishedOnly: false });
  const customRequests = await getCustomDestinationRequests();

  return (
    <div style={{ padding: "32px 36px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>Destinations</h1>
          <p className="muted" style={{ fontSize: 13.5 }}>
            {destinations.length} destinations in the database. Only published ones appear in the
            public trip planner and destination search.
          </p>
        </div>
        <Link href="/admin/destinations/new" className="btn-primary">
          Add destination
        </Link>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
              <th style={{ padding: "12px 16px" }}>Name</th>
              <th style={{ padding: "12px 16px" }}>Region</th>
              <th style={{ padding: "12px 16px" }}>Category</th>
              <th style={{ padding: "12px 16px" }}>Added to trips</th>
              <th style={{ padding: "12px 16px" }}>Status</th>
              <th style={{ padding: "12px 16px" }}></th>
            </tr>
          </thead>
          <tbody>
            {destinations.map((d) => (
              <tr key={d.dbId} style={{ borderBottom: "1px solid var(--line)" }}>
                <td style={{ padding: "12px 16px", fontWeight: 600 }}>{d.name}</td>
                <td style={{ padding: "12px 16px" }}>{d.region || "-"}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span className={`badge ${CATEGORY_BADGE[d.category] || "badge-muted"}`}>{d.category.replace("_", " ")}</span>
                </td>
                <td style={{ padding: "12px 16px", color: "var(--muted)" }}>{d.selectionCount}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span className={`badge ${d.published ? "badge-forest" : "badge-muted"}`}>
                    {d.published ? "Published" : "Hidden"}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", textAlign: "right" }}>
                  <Link href={`/admin/destinations/${d.dbId}`} style={{ fontSize: 13, fontWeight: 600 }}>
                    Edit →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 15, marginBottom: 8 }}>Customer-requested destinations</h2>
        <p className="muted" style={{ fontSize: 12.5, marginBottom: 14 }}>
          Places customers typed into the trip planner that are not in the catalogue above. These
          are never published automatically, review them here and add a real destination if it is
          worth offering.
        </p>
        {customRequests.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>No custom destination requests yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <tbody>
              {customRequests.slice(0, 20).map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ padding: "8px 6px", fontWeight: 600 }}>{r.name}</td>
                  <td style={{ padding: "8px 6px", color: "var(--muted)" }}>{r.source}</td>
                  <td style={{ padding: "8px 6px", color: "var(--muted)", whiteSpace: "nowrap" }}>
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
