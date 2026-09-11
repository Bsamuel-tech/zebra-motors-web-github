import Link from "next/link";
import { getBookings } from "@/lib/db/bookings";
import { formatRWF } from "@/data/vehicles";
import BookingStatusControl from "@/components/admin/BookingStatusControl";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage() {
  const bookings = await getBookings();

  return (
    <div style={{ padding: "32px 36px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 4 }}>
        <h1 style={{ fontSize: 24 }}>Bookings</h1>
        <Link href="/admin/bookings/new" className="btn-primary" style={{ fontSize: 13 }}>
          Add booking
        </Link>
      </div>
      <p className="muted" style={{ fontSize: 13.5, marginBottom: 20, maxWidth: 640 }}>
        {bookings.length === 0
          ? "No bookings recorded yet. Bookings appear here both when a customer submits a real request through the public /book flow, and when Zebra staff record one taken by phone or in person with \"Add booking\". No online payment is taken either way, that is still a separate, unbuilt piece of work."
          : `${bookings.length} bookings recorded. "Online request" bookings came from a real customer through the public site and are waiting on your review, "Staff entered" ones you or a colleague recorded directly. Real mileage tracking for these lives on the Trips page.`}
      </p>

      {bookings.length > 0 && (
        <div className="card">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
                <th style={{ padding: "12px 16px" }}>Booking</th>
                <th style={{ padding: "12px 16px" }}>Vehicle</th>
                <th style={{ padding: "12px 16px" }}>Customer</th>
                <th style={{ padding: "12px 16px" }}>Dates</th>
                <th style={{ padding: "12px 16px" }}>Pickup / drop-off</th>
                <th style={{ padding: "12px 16px" }}>Source</th>
                <th style={{ padding: "12px 16px" }}>Total</th>
                <th style={{ padding: "12px 16px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600 }}>
                    {b.bookingNumber}
                    {b.isDemo && (
                      <span className="badge badge-muted" style={{ marginLeft: 8 }}>
                        DEMO
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px" }}>{b.vehicleName || "-"}</td>
                  <td style={{ padding: "12px 16px" }}>{b.customerName || "-"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    {b.pickupDate} to {b.returnDate}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {b.pickupLocation || b.dropoffLocation ? (
                      <>
                        {b.pickupLocation || "-"}
                        {b.dropoffLocation && b.dropoffLocation !== b.pickupLocation ? ` to ${b.dropoffLocation}` : ""}
                      </>
                    ) : (
                      <span className="muted">Not provided</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span className={`badge ${b.source === "online_request" ? "badge-forest" : "badge-muted"}`}>
                      {b.source === "online_request" ? "Online request" : "Staff entered"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>RWF {formatRWF(b.totalRWF)}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <BookingStatusControl bookingId={b.id} status={b.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
