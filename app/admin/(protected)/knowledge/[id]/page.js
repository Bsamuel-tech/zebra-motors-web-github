import { notFound } from "next/navigation";
import { getKnowledgeArticleById } from "@/lib/db/knowledge";
import KnowledgeForm from "@/components/admin/KnowledgeForm";

export const dynamic = "force-dynamic";

export default async function EditKnowledgeArticlePage({ params }) {
  const article = await getKnowledgeArticleById(params.id);
  if (!article) notFound();
  return (
    <div style={{ padding: "32px 36px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Edit article</h1>
      <KnowledgeForm article={article} />
    </div>
  );
}
