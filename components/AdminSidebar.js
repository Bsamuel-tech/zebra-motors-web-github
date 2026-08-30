"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/fleet", label: "Fleet" },
  { href: "/admin/maintenance", label: "Maintenance" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/faq", label: "FAQ" },
  { href: "/admin/packages", label: "Travel packages" },
  { href: "/admin/guides", label: "Rwanda Guide" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/ai/what-if", label: "AI What If" },
  { href: "/admin/settings", label: "Business settings" },
];

export default function AdminSidebar({ user }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div
      style={{
        width: 220,
        flexShrink: 0,
        background: "var(--ink)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "22px 0",
      }}
    >
      <div style={{ padding: "0 22px 24px 22px" }}>
        <div className="serif" style={{ fontSize: 19, color: "#fff" }}>
          ZEBRA MOTORS
        </div>
        <div style={{ fontSize: 11.5, color: "#8c8873", letterSpacing: ".04em", textTransform: "uppercase" }}>
          Admin
        </div>
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                padding: "11px 22px",
                fontSize: 14,
                color: active ? "#fff" : "#c9c6b6",
                background: active ? "rgba(255,255,255,0.08)" : "transparent",
                borderLeft: active ? "3px solid var(--sand)" : "3px solid transparent",
                fontWeight: active ? 600 : 400,
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div style={{ padding: "16px 22px 0 22px", borderTop: "1px solid #3a3928" }}>
        <div style={{ fontSize: 12.5, color: "#fff", marginBottom: 2 }}>{user?.name}</div>
        <div style={{ fontSize: 11.5, color: "#8c8873", marginBottom: 12 }}>{user?.role}</div>
        <button
          onClick={logout}
          style={{
            background: "none",
            border: "1px solid #4a4938",
            color: "#c9c6b6",
            fontSize: 12.5,
            padding: "8px 14px",
            cursor: "pointer",
            width: "100%",
          }}
        >
          Log out
        </button>
      </div>
    </div>
  );
}
