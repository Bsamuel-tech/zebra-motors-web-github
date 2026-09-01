import Photo from "@/components/Photo";

export const metadata = { title: "Chauffeur Service, Zebra Motors" };

export default function ChauffeurPage() {
  return (
    <div>
      <div style={{ position: "relative", height: 260 }}>
        <Photo height="100%" />
        <div style={{ position: "absolute", inset: 0, background: "rgba(15,14,8,.5)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div className="wrap">
            <h1 style={{ color: "#fff", fontSize: 32, marginBottom: 8 }}>Travel with a professional driver</h1>
            <p style={{ color: "#edeae0", fontSize: 14.5, maxWidth: 500 }}>
              For unfamiliar roads, business schedules, night arrivals, or simply travelling
              without the driving.
            </p>
          </div>
        </div>
      </div>

      <div className="wrap" style={{ display: "flex", gap: 40, padding: "44px 32px", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 560px" }}>
          <h2 style={{ fontSize: 21, marginBottom: 16 }}>When a driver makes sense</h2>
          <div className="grid-2" style={{ marginBottom: 40, fontSize: 14, color: "var(--ink-soft)" }}>
            <div>• You&apos;re unfamiliar with Rwandan roads, or driving on the right for the first time</div>
            <div>• You&apos;re travelling for business and want to work between meetings</div>
            <div>• Your flight lands at night and you&apos;d rather not navigate unfamiliar streets</div>
            <div>• You&apos;re travelling as a group and want one coordinated itinerary</div>
          </div>

          <h2 style={{ fontSize: 21, marginBottom: 16 }}>How it works</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 40 }}>
            {[
              "Tell us your dates, route and whether it's a single transfer or a multi-day trip",
              "We assign a licensed, vetted driver and share their contact ahead of time",
              "Meet at your pickup point, hotel, airport, or office",
              "Travel with a local driver who knows the roads, with support behind them",
            ].map((t, i) => (
              <div key={t} style={{ display: "flex", gap: 12 }}>
                <div className="serif" style={{ fontSize: 22, color: "var(--forest-dark)", width: 28 }}>{i + 1}</div>
                <div style={{ fontSize: 14, color: "var(--ink-soft)", paddingTop: 3 }}>{t}</div>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 21, marginBottom: 16 }}>Frequently asked questions</h2>
          <FaqItem q="Can I switch from self-drive to a driver after booking?" a="Contact Zebra Motors to confirm the switching policy and any notice period needed." />
          <FaqItem q="Is the driver's fee included in the vehicle price?" a="No, chauffeur service is priced separately from the vehicle. Contact Zebra Motors for current rates." />
          <FaqItem q="Can a driver be booked for a multi-day trip, not just transfers?" a="Contact Zebra Motors to confirm availability for multi-day or corporate chauffeur bookings." last />
        </div>

        <div style={{ width: "100%", maxWidth: 360, flexShrink: 0 }}>
          <div className="card" style={{ padding: 22, marginBottom: 18 }}>
            <h3 style={{ fontSize: 17, marginBottom: 14 }}>Chauffeur rates</h3>
            <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.6, marginBottom: 16 }}>
              Chauffeur rates are quoted per trip. Contact Zebra Motors directly for current
              pricing on airport transfers, daily hire, and multi-day or corporate bookings.
            </p>
            <a href="/contact" className="btn-primary" style={{ width: "100%", textAlign: "center", display: "block" }}>
              Request a driver
            </a>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.6 }}>
              Driver profiles will be published here once Zebra confirms which drivers to feature.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FaqItem({ q, a, last }) {
  return (
    <div style={{ borderBottom: last ? "none" : "1px solid var(--line)", padding: "16px 0" }}>
      <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 4 }}>{q}</div>
      <div className="muted" style={{ fontSize: 13.5 }}>{a}</div>
    </div>
  );
}
