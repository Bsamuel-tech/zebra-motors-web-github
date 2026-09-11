import Link from "next/link";
import { getKnowledgeArticles } from "@/lib/db/knowledge";
import KnowledgeList from "@/components/admin/KnowledgeList";

export const dynamic = "force-dynamic";

export default async function AdminKnowledgePage() {
  const articles = await getKnowledgeArticles();
  const publishedCount = articles.filter((a) => a.published).length;

  return (
    <div style={{ padding: "32px 36px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>Zebra Knowledge</h1>
          <p className="muted" style={{ fontSize: 13.5, maxWidth: 640 }}>
            {publishedCount} of {articles.length} articles published. Zebra Assistant Support only ever
            quotes from a published article here, it never invents a policy answer. Write real
            Zebra policy text (cancellation, insurance, airport pickup, rental requirements,
            mileage, chauffeur, terms) and publish it so the AI can answer accurately.
          </p>
        </div>
        <Link href="/admin/knowledge/new" className="btn-primary">
          Add article
        </Link>
      </div>
      <KnowledgeList articles={articles} />
    </div>
  );
}
