export const metadata = { title: "Terms & Conditions, Zebra Motors" };

export default function TermsPage() {
  return (
    <div className="wrap" style={{ paddingTop: 40, paddingBottom: 70, maxWidth: 720 }}>
      <p className="eyebrow">Legal</p>
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>Terms &amp; conditions</h1>
      <div className="confirm-note" style={{ display: "block", marginBottom: 24 }}>
        Zebra Motors&apos; full terms and conditions are being finalized. Contact Zebra Motors
        directly with any questions before booking.
      </div>
      <p style={{ fontSize: 14, color: "var(--ink-soft)", marginBottom: 10 }}>
        The published terms will cover:
      </p>
      <ul style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 2, paddingLeft: 20 }}>
        {[
          "Rental eligibility and driver requirements",
          "Vehicle use, mileage and fuel policy",
          "Security deposit and refund conditions",
          "Cancellation and no-show policy",
          "Liability, insurance and excess",
          "Accidents and breakdown procedure",
          "Payment terms",
          "Governing law",
        ].map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
