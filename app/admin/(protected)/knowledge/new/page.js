import KnowledgeForm from "@/components/admin/KnowledgeForm";

export default function NewKnowledgeArticlePage() {
  return (
    <div style={{ padding: "32px 36px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Add knowledge article</h1>
      <KnowledgeForm article={null} />
    </div>
  );
}
