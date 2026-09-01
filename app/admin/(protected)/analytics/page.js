import { getAnalyticsSummary } from "@/lib/db/analytics";

export const dynamic = "force-dynamic";

function Bar({ value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ background: "var(--paper-alt)", height: 8, borderRadius: 2, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: "var(--forest-dark)" }} />
    </div>
  );
}

export default async function AdminAnalyticsPage() {
  const { totalViews, topPages, topVehicles, byDay, days } = await getAnalyticsSummary({ days: 30 });
  const maxPageViews = Math.max(1, ...topPages.map((p) => p.views));
  const maxVehicleViews = Math.max(1, ...topVehicles.map((v) => v.views));
  const maxDayViews = Math.max(1, ...byDay.map((d) => d.views));

  return (
    <div style={{ padding: "32px 36px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Analytics</h1>
      <p className="muted" style={{ fontSize: 13.5, marginBottom: 24, maxWidth: 640 }}>
        First-party page views logged directly by the server, no third-party analytics script,
        no cookies, no visitor identifiers. This answers which real pages and vehicles get
        looked at, it is not a substitute for a full analytics platform if Zebra chooses one
        later.
      </p>

      <div className="card" style={{ padding: 22, marginBottom: 24, maxWidth: 260 }}>
        <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
          Page views, last {days} days
        </div>
        <div style={{ fontSize: 32, fontFamily: "var(--font-serif, serif)" }}>{totalViews}</div>
      </div>

      {totalViews === 0 ? (
        <p className="muted" style={{ fontSize: 13.5 }}>
          No page views recorded yet. This starts filling in as soon as real visitors browse the
          site.
        </p>
      ) : (
        <div className="grid-2" style={{ gap: 24, marginBottom: 24 }}>
          <div className="card" style={{ padding: 20 }}>
            <h2 style={{ fontSize: 15, marginBottom: 14 }}>Most-viewed pages</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {topPages.map((p) => (
                <div key={p.path}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                    <span>{p.path}</span>
                    <span className="muted">{p.views}</span>
                  </div>
                  <Bar value={p.views} max={maxPageViews} />
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h2 style={{ fontSize: 15, marginBottom: 14 }}>Most-viewed vehicles</h2>
            {topVehicles.length === 0 ? (
              <p className="muted" style={{ fontSize: 12.5 }}>No vehicle detail pages viewed yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {topVehicles.map((v) => (
                  <div key={v.slug}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                      <span>{v.name}</span>
                      <span className="muted">{v.views}</span>
                    </div>
                    <Bar value={v.views} max={maxVehicleViews} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {byDay.length > 0 && (
        <div className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 15, marginBottom: 14 }}>Views by day</h2>
          <div style={{ display: "flex", gap: 4, height: 100 }}>
            {byDay.map((d) => (
              <div
                key={d.day}
                title={`${d.day}: ${d.views}`}
                style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
              >
                <div
                  style={{
                    background: "var(--forest-dark)",
                    height: `${Math.max(4, Math.round((d.views / maxDayViews) * 100))}%`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
