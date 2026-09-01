import { notFound } from "next/navigation";
import { getFaqs } from "@/lib/db/faq";
import FaqForm from "@/components/admin/FaqForm";

export const dynamic = "force-dynamic";

export default async function EditFaqPage({ params }) {
  const faq = (await getFaqs()).find((f) => f.id === params.id);
  if (!faq) notFound();

  return (
    <div style={{ padding: "32px 36px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Edit FAQ</h1>
      <FaqForm faq={faq} />
    </div>
  );
}
