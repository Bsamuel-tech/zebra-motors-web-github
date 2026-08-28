"use client";

import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="wrap" style={{ paddingTop: 60, paddingBottom: 90, display: "flex", justifyContent: "center" }}>
      <div className="card" style={{ padding: 34, width: 380 }}>
        <h1 style={{ fontSize: 22, marginBottom: 6 }}>Sign in</h1>
        <p className="muted" style={{ fontSize: 13, marginBottom: 22 }}>
          Access your bookings, documents and receipts.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            window.location.href = "/account";
          }}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <div className="field">
            <label>Email</label>
            <input type="email" required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" required />
          </div>
          <button type="submit" className="btn-primary" style={{ width: "100%" }}>
            Sign in
          </button>
        </form>
        <div className="muted" style={{ fontSize: 12.5, marginTop: 16, textAlign: "center" }}>
          New here? <Link href="/cars">Book your first rental</Link> to create an account.
        </div>
      </div>
    </div>
  );
}
