import FaqForm from "@/components/admin/FaqForm";

export default function NewFaqPage() {
  return (
    <div style={{ padding: "32px 36px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Add FAQ</h1>
      <FaqForm faq={null} />
    </div>
  );
}
