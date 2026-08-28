import Link from "next/link";
import { getPackages } from "@/lib/db/packages";

export const dynamic = "force-dynamic";

export default function AdminPackagesPage() {
  const packages = getPackages();

  return (
    <div style={{ padding: "32px 36px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>Travel packages</h1>
          <p className="muted" style={{ fontSize: 13.5 }}>
            {packages.length} packages in the database. Pricing is not shown on these packages
            yet (Section 20, decisions needed), the summary and inclusions here are what is real.
          </p>
        </div>
        <Link href="/admin/packages/new" className="btn-primary">
          Add package
        </Link>
      </div>

      <div className="card">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
              <th style={{ padding: "12px 16px" }}>Package</th>
              <th style={{ padding: "12px 16px" }}>Duration</th>
              <th style={{ padding: "12px 16px" }}>Status</th>
              <th style={{ padding: "12px 16px" }}></th>
            </tr>
          </thead>
          <tbody>
            {packages.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid var(--line)" }}>
                <td style={{ padding: "12px 16px", fontWeight: 600 }}>{p.name}</td>
                <td style={{ padding: "12px 16px" }}>{p.duration}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span className={`badge ${p.published ? "badge-forest" : "badge-muted"}`}>
                    {p.published ? "Published" : "Hidden"}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", textAlign: "right" }}>
                  <Link href={`/admin/packages/${p.id}`} style={{ fontSize: 13, fontWeight: 600 }}>
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
