import { notFound } from "next/navigation";
import Photo from "@/components/Photo";
import { getArticleBySlug } from "@/lib/db/guideArticles";
import { recordPageView } from "@/lib/db/analytics";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }) {
  const article = getArticleBySlug(params.slug);
  if (!article) return {};
  return { title: `${article.title}, Zebra Motors` };
}

export default function GuideArticlePage({ params }) {
  const article = getArticleBySlug(params.slug);
  if (!article || article.status !== "published") notFound();
  recordPageView(`/rwanda-guide/${article.slug}`);

  return (
    <div className="wrap" style={{ paddingTop: 30, paddingBottom: 70, maxWidth: 720 }}>
      <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
        Home / Rwanda Guide / {article.title}
      </div>
      <Photo height={280} style={{ marginBottom: 26 }} />
      <h1 style={{ fontSize: 28, marginBottom: 22 }}>{article.title}</h1>
      {article.body.map((para, i) => (
        <p key={i} style={{ fontSize: 15, color: "var(--ink-soft)", lineHeight: 1.8, marginBottom: 16 }}>
          {para}
        </p>
      ))}
    </div>
  );
}
