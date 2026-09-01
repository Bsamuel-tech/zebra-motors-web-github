import Link from "next/link";
import { getCustomers } from "@/lib/db/customers";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const customers = await getCustomers();

  return (
    <div style={{ padding: "32px 36px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Customers</h1>
      <p className="muted" style={{ fontSize: 13.5, marginBottom: 20, maxWidth: 640 }}>
        {customers.length === 0
          ? "No customer records yet. A customer is created here from a real booking (not yet built, Phase 3D) or by converting a real lead on the "
          : `${customers.length} customers on file. New records come from a real booking (not yet built, Phase 3D) or from converting a lead on the `}
        <Link href="/admin/leads" style={{ fontWeight: 600 }}>
          Leads
        </Link>{" "}
        page. Nothing has been invented to fill this page.
      </p>

      {customers.length > 0 && (
        <div className="card">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
                <th style={{ padding: "12px 16px" }}>Name</th>
                <th style={{ padding: "12px 16px" }}>Email</th>
                <th style={{ padding: "12px 16px" }}>Phone</th>
                <th style={{ padding: "12px 16px" }}>Country</th>
                <th style={{ padding: "12px 16px" }}>Since</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600 }}>{c.name}</td>
                  <td style={{ padding: "12px 16px" }}>{c.email}</td>
                  <td style={{ padding: "12px 16px" }}>{c.phone || "-"}</td>
                  <td style={{ padding: "12px 16px" }}>{c.country || "-"}</td>
                  <td style={{ padding: "12px 16px" }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
