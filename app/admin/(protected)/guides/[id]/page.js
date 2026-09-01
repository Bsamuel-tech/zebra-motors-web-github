import { notFound } from "next/navigation";
import { getArticleById } from "@/lib/db/guideArticles";
import GuideForm from "@/components/admin/GuideForm";

export const dynamic = "force-dynamic";

export default async function EditGuidePage({ params }) {
  const article = await getArticleById(params.id);
  if (!article) notFound();

  return (
    <div style={{ padding: "32px 36px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>{article.title}</h1>
      <GuideForm article={article} />
    </div>
  );
}
