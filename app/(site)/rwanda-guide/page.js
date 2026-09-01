import Link from "next/link";
import Photo from "@/components/Photo";
import { getArticles } from "@/lib/db/guideArticles";
import { recordPageView } from "@/lib/db/analytics";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rwanda Guide, Zebra Motors" };

export default async function RwandaGuidePage() {
  await recordPageView("/rwanda-guide");
  const guideArticles = await getArticles({ publishedOnly: true });

  return (
    <div className="wrap" style={{ paddingTop: 40, paddingBottom: 70 }}>
      <p className="eyebrow">Rwanda guide</p>
      <h1 style={{ fontSize: 30, marginBottom: 12 }}>Real, useful travel information</h1>
      <p style={{ fontSize: 14.5, color: "var(--ink-soft)", marginBottom: 30, maxWidth: 620 }}>
        Replaces the used-car-buying blog found on the previous site with content that actually
        matches what someone planning a Rwanda trip searches for.
      </p>
      <div className="grid-3">
        {guideArticles.map((a) => (
          <Link href={`/rwanda-guide/${a.slug}`} key={a.slug} className="card" style={{ display: "block", color: "inherit" }}>
            <Photo height={140} />
            <div style={{ padding: 18 }}>
              <h3 style={{ fontSize: 16.5, marginBottom: 8 }}>{a.title}</h3>
              <p className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>{a.excerpt}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
