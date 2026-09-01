import Link from "next/link";
import { getLeads, getLeadsSummary } from "@/lib/db/leads";
import LeadsTable from "@/components/admin/LeadsTable";

export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
  const leads = await getLeads();
  const summary = await getLeadsSummary();

  return (
    <div style={{ padding: "32px 36px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Leads</h1>
      <p className="muted" style={{ fontSize: 13.5, marginBottom: 20, maxWidth: 640 }}>
        Every real submission from the public contact form, nothing here is invented or sample
        data. This is the top of the pipeline, before a booking exists, converting a lead creates
        a real record on the{" "}
        <Link href="/admin/customers" style={{ fontWeight: 600 }}>
          Customers
        </Link>{" "}
        page.
      </p>

      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <SummaryCard label="Total" value={summary.total} />
        <SummaryCard label="New" value={summary.counts.NEW} />
        <SummaryCard label="Contacted" value={summary.counts.CONTACTED} />
        <SummaryCard label="Converted" value={summary.counts.CONVERTED} />
        <SummaryCard label="Lost" value={summary.counts.LOST} />
      </div>

      <LeadsTable leads={leads} />
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="card" style={{ padding: "14px 18px", minWidth: 100 }}>
      <div style={{ fontSize: 22, fontWeight: 600 }}>{value}</div>
      <div className="muted" style={{ fontSize: 11.5 }}>{label}</div>
    </div>
  );
}
