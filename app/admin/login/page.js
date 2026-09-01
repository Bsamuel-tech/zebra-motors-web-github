"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Could not sign in.");
      return;
    }
    router.push(searchParams.get("next") || "/admin/dashboard");
    router.refresh();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--ink)",
        padding: 20,
      }}
    >
      <form
        onSubmit={onSubmit}
        className="card"
        style={{ width: "100%", maxWidth: 360, padding: 32, background: "#fff" }}
      >
        <div className="serif" style={{ fontSize: 22, marginBottom: 4 }}>
          ZEBRA MOTORS
        </div>
        <div className="muted" style={{ fontSize: 13, marginBottom: 24 }}>
          Admin sign in
        </div>

        <div className="field" style={{ marginBottom: 14 }}>
          <label>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </div>
        <div className="field" style={{ marginBottom: 18 }}>
          <label>Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        {error && (
          <div className="confirm-note" style={{ display: "block", marginBottom: 14, width: "100%" }}>
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary" style={{ width: "100%" }} disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
