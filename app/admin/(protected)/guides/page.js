import Link from "next/link";
import { getArticles } from "@/lib/db/guideArticles";

export const dynamic = "force-dynamic";

const STATUS_COLORS = {
  published: "badge-forest",
  scheduled: "badge-sand",
  draft: "badge-muted",
  archived: "badge-muted",
};

export default function AdminGuidesPage() {
  const articles = getArticles();

  return (
    <div style={{ padding: "32px 36px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>Rwanda Guide</h1>
          <p className="muted" style={{ fontSize: 13.5 }}>
            {articles.length} articles in the database. Only articles with status
            &quot;published&quot; appear on the public Rwanda Guide.
          </p>
        </div>
        <Link href="/admin/guides/new" className="btn-primary">
          Add article
        </Link>
      </div>

      <div className="card">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
              <th style={{ padding: "12px 16px" }}>Title</th>
              <th style={{ padding: "12px 16px" }}>Category</th>
              <th style={{ padding: "12px 16px" }}>Status</th>
              <th style={{ padding: "12px 16px" }}></th>
            </tr>
          </thead>
          <tbody>
            {articles.map((a) => (
              <tr key={a.id} style={{ borderBottom: "1px solid var(--line)" }}>
                <td style={{ padding: "12px 16px", fontWeight: 600 }}>{a.title}</td>
                <td style={{ padding: "12px 16px" }}>{a.category}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span className={`badge ${STATUS_COLORS[a.status] || "badge-muted"}`}>{a.status}</span>
                </td>
                <td style={{ padding: "12px 16px", textAlign: "right" }}>
                  <Link href={`/admin/guides/${a.id}`} style={{ fontSize: 13, fontWeight: 600 }}>
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
