import Link from "next/link";

export const metadata = { title: "Driving in Rwanda, Zebra Motors" };

export default function DrivingPage() {
  return (
    <div className="wrap" style={{ paddingTop: 40, paddingBottom: 70, maxWidth: 720 }}>
      <p className="eyebrow">Before you drive</p>
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>Driving in Rwanda</h1>
      <p style={{ fontSize: 14.5, color: "var(--ink-soft)", lineHeight: 1.75, marginBottom: 20 }}>
        Rwanda drives on the right. Kigali&apos;s main roads are paved and well organised; roads
        outside the capital and inside national parks vary, some are unpaved and better suited to
        a 4WD vehicle. If any of this sounds like more than you want to manage, a professional
        driver is available on every vehicle we rent.
      </p>
      <div style={{ display: "flex", gap: 14, marginBottom: 30, flexWrap: "wrap" }}>
        <Link href="/rwanda-guide/self-drive-rwanda-what-visitors-need-to-know" className="btn-outline">
          Read the full self-drive guide
        </Link>
        <Link href="/chauffeur" className="btn-outline">
          See chauffeur service
        </Link>
      </div>
      <div className="confirm-note" style={{ display: "block" }}>
        Document requirements, including whether an International Driving Permit is needed, vary
        by nationality. Confirm with Zebra Motors or current official guidance before you travel.
      </div>
    </div>
  );
}
