export const metadata = { title: "Insurance, Zebra Motors" };

export default function InsurancePage() {
  return (
    <div className="wrap" style={{ paddingTop: 40, paddingBottom: 70, maxWidth: 720 }}>
      <p className="eyebrow">Trust &amp; safety</p>
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>Insurance</h1>
      <p style={{ fontSize: 14.5, color: "var(--ink-soft)", lineHeight: 1.75, marginBottom: 20 }}>
        Every rental includes third-party liability insurance. What that covers, what it doesn&apos;t,
        and what the security deposit is for, are exactly the questions international customers
        ask before trusting a company with a rental, so this page needs real, specific answers
        rather than a generic reassurance.
      </p>
      <div className="confirm-note" style={{ display: "block", marginBottom: 24 }}>
        Full insurance and deposit details are being finalized with Zebra Motors. Contact Zebra
        directly for current coverage, deposit, and claims information before you book.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {["What's covered", "What's not covered", "Security deposit", "Filing a claim", "Roadside assistance"].map((t) => (
          <div key={t} className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{t}</div>
            <div className="muted" style={{ fontSize: 13.5 }}>Details coming soon, contact Zebra Motors for current information.</div>
          </div>
        ))}
      </div>
    </div>
  );
}
