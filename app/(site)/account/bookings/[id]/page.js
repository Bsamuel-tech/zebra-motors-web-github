import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCustomerSession } from "@/lib/auth/requireCustomer";
import { getCustomerById, getBookingsForCustomer } from "@/lib/db/customers";
import { getSettings } from "@/lib/db/settings";

export const metadata = { title: "Booking details, Zebra Motors" };

export default async function BookingDetailPage({ params }) {
  const session = await getCustomerSession();
  if (!session) redirect(`/login?next=/account/bookings/${params.id}`);

  const customer = await getCustomerById(session.customerId);
  if (!customer) redirect("/login?next=/account");

  // Loaded from this customer's own booking list, not looked up by id
  // directly, so one customer can never view another customer's booking by
  // guessing an id.
  const bookings = await getBookingsForCustomer(customer.id);
  const booking = bookings.find((b) => b.id === params.id);
  if (!booking) notFound();

  const settings = await getSettings();

  return (
    <div className="wrap" style={{ paddingTop: 30, paddingBottom: 70, maxWidth: 700 }}>
      <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
        <Link href="/account">Account</Link> / Booking {booking.booking_number}
      </div>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>Booking {booking.booking_number}</h1>

      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ marginBottom: 18, paddingBottom: 18, borderBottom: "1px solid var(--line)" }}>
          <div style={{ fontSize: 17, fontWeight: 600 }}>{booking.vehicle_name || "Vehicle"}</div>
          <div className="muted" style={{ fontSize: 13 }}>{booking.service_type}</div>
        </div>
        <Row label="Pickup" value={booking.pickup_date} />
        <Row label="Return" value={booking.return_date} />
        <Row label="Status" value={booking.status} />
        <Row
          label="Total"
          value={Number.isFinite(booking.total_rwf) ? `RWF ${Number(booking.total_rwf).toLocaleString()}` : "Not set"}
        />
        <Row
          label="Payment"
          value="Arranged directly with Zebra Motors, no online payment is taken through this site."
          last
        />
      </div>

      <p className="muted" style={{ fontSize: 13, marginBottom: 20 }}>
        To change or cancel this booking, or ask about payment, contact Zebra Motors directly at{" "}
        {settings.phoneDisplay} or <a href={`mailto:${settings.email}`}>{settings.email}</a>.
      </p>
    </div>
  );
}

function Row({ label, value, last }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        fontSize: 14,
        color: "var(--ink-soft)",
        padding: "8px 0",
        borderBottom: last ? "none" : "1px solid var(--line)",
      }}
    >
      <span>{label}</span>
      <span style={{ fontWeight: 500, textAlign: "right" }}>{value}</span>
    </div>
  );
}
