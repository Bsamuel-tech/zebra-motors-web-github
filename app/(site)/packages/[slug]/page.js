import Link from "next/link";
import { notFound } from "next/navigation";
import Photo from "@/components/Photo";
import { getPackageBySlug } from "@/lib/db/packages";
import { recordPageView } from "@/lib/db/analytics";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const pkg = await getPackageBySlug(params.slug);
  if (!pkg) return {};
  return { title: `${pkg.name}, Zebra Motors` };
}

export default async function PackageDetailPage({ params }) {
  const pkg = await getPackageBySlug(params.slug);
  if (!pkg || !pkg.published) notFound();
  await recordPageView(`/packages/${pkg.slug}`);

  return (
    <div className="wrap" style={{ paddingTop: 26, paddingBottom: 70 }}>
      <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
        Home / Packages / {pkg.name}
      </div>
      <div style={{ display: "flex", gap: 36, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 500px" }}>
          <Photo height={320} style={{ marginBottom: 24 }} />
          <span className="badge badge-forest">{pkg.duration}</span>
          <h1 style={{ fontSize: 28, margin: "12px 0 14px 0" }}>{pkg.name}</h1>
          <p style={{ fontSize: 14.5, color: "var(--ink-soft)", lineHeight: 1.7, marginBottom: 24 }}>{pkg.summary}</p>

          <h2 style={{ fontSize: 19, marginBottom: 12 }}>What&apos;s included</h2>
          <div style={{ marginBottom: 24 }}>
            {pkg.includes.map((i) => (
              <div key={i} style={{ fontSize: 14, color: "var(--ink-soft)", marginBottom: 6 }}>✓ {i}</div>
            ))}
          </div>

          <h2 style={{ fontSize: 19, marginBottom: 12 }}>Best for</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {pkg.bestFor.map((b) => (
              <span key={b} className="badge badge-muted">{b}</span>
            ))}
          </div>
        </div>

        <div style={{ width: "100%", maxWidth: 340, flexShrink: 0 }}>
          <div className="card" style={{ padding: 22 }}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
              [Pricing configured in the admin platform, Section 20 of the discovery report]
            </div>
            <Link href="/book" className="btn-primary" style={{ width: "100%", textAlign: "center", display: "block" }}>
              Enquire about this package
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
