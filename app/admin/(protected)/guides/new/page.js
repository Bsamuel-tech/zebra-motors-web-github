import GuideForm from "@/components/admin/GuideForm";

export default function NewGuidePage() {
  return (
    <div style={{ padding: "32px 36px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Add Rwanda Guide article</h1>
      <GuideForm article={null} />
    </div>
  );
}
