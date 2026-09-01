import Link from "next/link";
import Photo from "@/components/Photo";
import { getPackages } from "@/lib/db/packages";
import { recordPageView } from "@/lib/db/analytics";

export const dynamic = "force-dynamic";
export const metadata = { title: "Travel Packages, Zebra Motors" };

export default async function PackagesPage() {
  await recordPageView("/packages");
  const packages = await getPackages({ publishedOnly: true });

  return (
    <div className="wrap" style={{ paddingBottom: 70 }}>
      <div style={{ padding: "40px 0 8px 0", maxWidth: 640 }}>
        <p className="eyebrow">Travel packages</p>
        <h1 style={{ fontSize: 30, marginBottom: 12 }}>
          Vehicle, route and driver, bundled for the trip you&apos;re already planning
        </h1>
        <p style={{ fontSize: 14.5, color: "var(--ink-soft)", lineHeight: 1.6 }}>
          Each package combines a vehicle class, a suggested duration and an optional driver.
          Final pricing is configured by Zebra and shown at checkout, nothing here is charged
          until you book.
        </p>
      </div>

      <div className="grid-3" style={{ marginTop: 30 }}>
        {packages.map((p) => (
          <div className="card" key={p.slug}>
            <Photo height={150} />
            <div style={{ padding: 18 }}>
              <span className="badge badge-forest">{p.duration}</span>
              <h3 style={{ fontSize: 18, margin: "10px 0 6px 0" }}>{p.name}</h3>
              <p style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.6, marginBottom: 12 }}>
                {p.summary}
              </p>
              <div className="muted" style={{ fontSize: 11.5, marginBottom: 12 }}>
                Includes: {p.includes.join(", ")}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="muted" style={{ fontSize: 12.5 }}>[Pricing set in admin]</span>
                <Link href={`/packages/${p.slug}`} style={{ fontSize: 13, fontWeight: 600 }}>
                  View package →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
