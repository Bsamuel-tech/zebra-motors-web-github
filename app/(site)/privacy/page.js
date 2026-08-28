export const metadata = { title: "Privacy Policy, Zebra Motors" };

export default function PrivacyPage() {
  return (
    <div className="wrap" style={{ paddingTop: 40, paddingBottom: 70, maxWidth: 720 }}>
      <p className="eyebrow">Legal</p>
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>Privacy policy</h1>
      <p style={{ fontSize: 14.5, color: "var(--ink-soft)", lineHeight: 1.75, marginBottom: 20 }}>
        Because Zebra Motors serves customers from Europe and elsewhere, this policy is written
        with GDPR principles in mind: collect only what&apos;s needed, say clearly what it&apos;s
        used for, and give customers control over their own data. That said, actually meeting
        GDPR is a legal determination, not a design choice, this page should not claim compliance
        until a qualified reviewer confirms it.
      </p>
      <div className="confirm-note" style={{ display: "block", marginBottom: 24 }}>
        This page is being drafted and reviewed by someone qualified in data protection law.
        Contact Zebra Motors directly with any privacy questions in the meantime.
      </div>
      <p style={{ fontSize: 14, color: "var(--ink-soft)", marginBottom: 10 }}>
        The published policy will cover:
      </p>
      <ul style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 2, paddingLeft: 20 }}>
        {[
          "What information we collect (booking details, documents, payment metadata)",
          "Why we collect it",
          "How long we keep it",
          "Who it's shared with (such as payment providers)",
          "Your rights (access, correction, deletion)",
          "Cookies and analytics",
          "Contact for privacy requests",
        ].map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
