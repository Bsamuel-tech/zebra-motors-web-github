"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/customer-auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button type="button" className="btn-outline" onClick={handleLogout} disabled={loading}>
      {loading ? "Signing out..." : "Sign out"}
    </button>
  );
}
