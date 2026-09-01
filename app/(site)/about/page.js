export const metadata = { title: "About, Zebra Motors" };

export default function AboutPage() {
  return (
    <div className="wrap" style={{ paddingTop: 40, paddingBottom: 70, maxWidth: 760 }}>
      <p className="eyebrow">About Zebra Motors</p>
      <h1 style={{ fontSize: 30, marginBottom: 20 }}>A Kigali-based car rental company, going international</h1>
      <p style={{ fontSize: 15, color: "var(--ink-soft)", lineHeight: 1.75, marginBottom: 18 }}>
        Zebra Motors rents vehicles in Kigali, Rwanda, for local customers, the Rwandan diaspora
        visiting family, and international tourists and business travellers. This site is the
        result of a digital transformation project: the same company, real vehicles and real
        pricing, presented the way an international visitor expects to be able to research, book
        and pay for a rental before they arrive.
      </p>
      <h2 style={{ fontSize: 20, marginBottom: 12 }}>Why Zebra</h2>
      <ul style={{ fontSize: 14.5, color: "var(--ink-soft)", lineHeight: 1.9, paddingLeft: 20 }}>
        <li>Kigali-based, with in-person vehicle handover, not a faceless online-only operator</li>
        <li>Self-drive, with a professional driver available on request</li>
        <li>Published daily rate ranges in RWF</li>
        <li>Real customer reviews, quoted as published</li>
      </ul>
    </div>
  );
}
