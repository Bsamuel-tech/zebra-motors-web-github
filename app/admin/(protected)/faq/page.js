import Link from "next/link";
import { getFaqs } from "@/lib/db/faq";
import FaqList from "@/components/admin/FaqList";

export const dynamic = "force-dynamic";

export default function AdminFaqPage() {
  const faqs = getFaqs();

  return (
    <div style={{ padding: "32px 36px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>FAQ</h1>
          <p className="muted" style={{ fontSize: 13.5 }}>
            {faqs.length} entries in the database. Changes here take effect on the public FAQ
            page immediately.
          </p>
        </div>
        <Link href="/admin/faq/new" className="btn-primary">
          Add FAQ
        </Link>
      </div>
      <FaqList faqs={faqs} />
    </div>
  );
}
