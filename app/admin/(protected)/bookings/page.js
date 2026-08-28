import { getBookings } from "@/lib/db/bookings";
import { formatRWF } from "@/data/vehicles";
import BookingStatusControl from "@/components/admin/BookingStatusControl";

export const dynamic = "force-dynamic";

export default function AdminBookingsPage() {
  const bookings = getBookings();

  return (
    <div style={{ padding: "32px 36px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Bookings</h1>
      <p className="muted" style={{ fontSize: 13.5, marginBottom: 20, maxWidth: 640 }}>
        {bookings.length === 0
          ? "No bookings yet. The public booking flow is still a labelled demo and does not save here, real booking creation is Phase 3D and needs a payment provider plus the outstanding business policy decisions (deposit, cancellation, insurance) before it can go live. This page is ready for real bookings the moment that exists."
          : `${bookings.length} bookings recorded.`}
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
