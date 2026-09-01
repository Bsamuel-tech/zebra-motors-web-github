import Link from "next/link";

// Only lists pages that actually exist and show real data. The previous
// version of this nav listed Documents, Payments & invoices, Saved
// vehicles, and Reviews, none of which had any real page or data behind
// them, an admin-only feature list masquerading as a customer feature list
// (Rule 5). Trimmed to what is real; more sections can be added here once
// they exist for real, not before.
const ITEMS = [{ key: "overview", label: "Overview & bookings", href: "/account" }];

export default function AccountNav({ active }) {
  return (
    <div style={{ width: 220, flexShrink: 0 }}>
      {ITEMS.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          style={{
            display: "block",
            padding: "12px 16px",
            fontSize: 14,
            color: active === item.key ? "var(--ink)" : "var(--ink-soft)",
            fontWeight: active === item.key ? 600 : 400,
            background: active === item.key ? "var(--paper-alt)" : "transparent",
          }}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
