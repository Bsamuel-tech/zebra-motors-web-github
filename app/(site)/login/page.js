"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// Real customer authentication (Section 7/8 of the presentation-readiness
// pass, Option A). Signs in against a real customers row via
// /api/customer-auth/login, or creates one via /api/customer-auth/signup.
// No demo data, no fake redirect on submit, a wrong password shows a real
// error from the server.
export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/account";

  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const endpoint = mode === "signin" ? "/api/customer-auth/login" : "/api/customer-auth/signup";
      const payload =
        mode === "signin"
          ? { email: form.email, password: form.password }
          : { name: form.name, email: form.email, phone: form.phone, password: form.password };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="wrap" style={{ paddingTop: 60, paddingBottom: 90, display: "flex", justifyContent: "center" }}>
      <div className="card" style={{ padding: 34, width: 380 }}>
        <h1 style={{ fontSize: 22, marginBottom: 6 }}>{mode === "signin" ? "Sign in" : "Create your account"}</h1>
        <p className="muted" style={{ fontSize: 13, marginBottom: 22 }}>
          {mode === "signin"
            ? "Access your bookings and profile."
            : "Track your bookings and manage your details with Zebra Motors."}
        </p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {mode === "signup" && (
            <div className="field">
              <label>Full name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </div>
          )}
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </div>
          {mode === "signup" && (
            <div className="field">
              <label>Phone (optional)</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
            </div>
          )}
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              required
              minLength={mode === "signup" ? 8 : undefined}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
            />
            {mode === "signup" && (
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                At least 8 characters.
              </div>
            )}
          </div>

          {error && (
            <div style={{ fontSize: 13, color: "var(--danger)", background: "rgba(198,40,40,0.08)", padding: "10px 12px", borderRadius: 4 }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary" style={{ width: "100%" }} disabled={submitting}>
            {submitting ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
        <div className="muted" style={{ fontSize: 12.5, marginTop: 16, textAlign: "center" }}>
          {mode === "signin" ? (
            <>
              New here?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError("");
                }}
                style={{ background: "none", border: "none", padding: 0, font: "inherit", fontWeight: 600, color: "var(--ink)", cursor: "pointer" }}
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError("");
                }}
                style={{ background: "none", border: "none", padding: 0, font: "inherit", fontWeight: 600, color: "var(--ink)", cursor: "pointer" }}
              >
                Sign in
              </button>
            </>
          )}
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 18, textAlign: "center" }}>
          Prefer not to create an account? <Link href="/book">Book without signing in</Link>.
        </div>
      </div>
    </div>
  );
}
