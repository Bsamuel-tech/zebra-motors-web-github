import { getExtras } from "@/lib/db/extras";
import ExtrasTable from "@/components/admin/ExtrasTable";

export const dynamic = "force-dynamic";

export default function AdminExtrasPage() {
  const extras = getExtras();
  const liveCount = extras.filter((e) => e.active).length;

  return (
    <div style={{ padding: "32px 36px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Booking extras</h1>
      <p className="muted" style={{ fontSize: 13.5, marginBottom: 20, maxWidth: 640 }}>
        Optional services a customer can add to a booking. Each one starts hidden with no price,
        the booking page never shows a fee that has not been confirmed here first, so nothing on
        the public site is an estimate or a placeholder. {liveCount} of {extras.length} are
        currently shown to customers.
      </p>

      <ExtrasTable extras={extras} />
    </div>
  );
}
