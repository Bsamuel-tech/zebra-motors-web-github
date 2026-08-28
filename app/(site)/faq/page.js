import { getFaqs } from "@/lib/db/faq";
import FaqAccordion from "@/components/FaqAccordion";

export const dynamic = "force-dynamic";
export const metadata = { title: "FAQ, Zebra Motors" };

export default function FaqPage() {
  const faqs = getFaqs({ publishedOnly: true });

  return (
    <div className="wrap" style={{ paddingTop: 40, paddingBottom: 70, maxWidth: 760 }}>
      <p className="eyebrow">Support</p>
      <h1 style={{ fontSize: 30, marginBottom: 26 }}>Frequently asked questions</h1>
      <FaqAccordion faqs={faqs} />
    </div>
  );
}
