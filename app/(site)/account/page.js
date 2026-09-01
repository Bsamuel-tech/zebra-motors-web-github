import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/auth/requireCustomer";
import { getCustomerById, getBookingsForCustomer } from "@/lib/db/customers";
import { getSettings } from "@/lib/db/settings";
import AccountNav from "@/components/AccountNav";
import LogoutButton from "@/components/LogoutButton";

export const metadata = { title: "My Account, Zebra Motors" };

// middleware.js already redirects a signed-out visitor to /login before
// this ever renders, this second check is defense in depth (the same
// pattern app/admin/(protected)/layout.js uses), and it is what gets this
// page the real customer record to display.
export default async function AccountPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/login?next=/account");

  const customer = await getCustomerById(session.customerId);
  if (!customer) redirect("/login?next=/account");

  const bookings = await getBookingsForCustomer(customer.id);
  const settings = await getSettings();

  return (
    <div className="wrap" style={{ paddingTop: 30, paddingBottom: 70 }}>
      <div style={{ display: "flex", gap: 36, flexWrap: "wrap" }}>
        <AccountNav active="overview" />

        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ fontSize: 24, marginBottom: 4 }}>Welcome, {customer.name}</h1>
              <p className="muted" style={{ fontSize: 14, marginBottom: 26 }}>
                Your real bookings and profile, in one place.
              </p>
            </div>
            <LogoutButton />
          </div>

          <h2 style={{ fontSize: 18, marginBottom: 14 }}>Your bookings</h2>
          {bookings.length === 0 ? (
            <div className="card" style={{ padding: 22, marginBottom: 34 }}>
              <p style={{ fontSize: 14, marginBottom: 12 }}>You have no bookings yet.</p>
              <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
                Bookings placed through Zebra Motors, whether started online or arranged by phone, will
                show up here once they are recorded on your account.
              </p>
              <Link href="/cars" className="btn-primary" style={{ display: "inline-block" }}>
                Browse the fleet
              </Link>
            </div>
          ) : (
            <div style={{ border: "1px solid var(--line)", marginBottom: 34 }}>
              {bookings.map((b, i) => (
                <div
                  key={b.id}
                  style={{
                    padding: "16px 18px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: i === bookings.length - 1 ? "none" : "1px solid var(--line)",
                    background: "#fff",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{b.vehicle_name || "Vehicle"}</div>
                    <div className="muted" style={{ fontSize: 12.5 }}>
                      {b.pickup_date} to {b.return_date} · Booking {b.booking_number}
                    </div>
                  </div>
                  <span className="badge badge-muted">{b.status}</span>
                  <Link href={`/account/bookings/${b.id}`} style={{ fontSize: 13, fontWeight: 600 }}>
                    View details
                  </Link>
                </div>
              ))}
            </div>
          )}

          <h2 style={{ fontSize: 18, marginBottom: 14 }}>Profile</h2>
          <div className="card" style={{ padding: 22, marginBottom: 34 }}>
            <Row label="Name" value={customer.name} />
            <Row label="Email" value={customer.email} />
            <Row label="Phone" value={customer.phone || "Not provided"} last />
          </div>
          <p className="muted" style={{ fontSize: 12.5, marginBottom: 34 }}>
            Editing your profile from this page is coming next. To update your details now, contact
            Zebra Motors directly at {settings.phoneDisplay} or {settings.email}.
          </p>

          <h2 style={{ fontSize: 18, marginBottom: 14 }}>Support</h2>
          <div className="card" style={{ padding: 22 }}>
            <p style={{ fontSize: 14, marginBottom: 4 }}>Questions about a booking or your account?</p>
            <p className="muted" style={{ fontSize: 13 }}>
              Call {settings.phoneDisplay} or email{" "}
              <a href={`mailto:${settings.email}`}>{settings.email}</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, last }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: 14,
        color: "var(--ink-soft)",
        padding: "8px 0",
        borderBottom: last ? "none" : "1px solid var(--line)",
      }}
    >
      <span>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}
