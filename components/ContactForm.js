"use client";

import { useState } from "react";
import { telLink, mailtoLink } from "@/data/settings";

// settings is passed down from the server component at
// app/(site)/contact/page.js (Phase 3B, database-backed). Submitting this
// form creates a real lead record (see lib/db/leads.js), it used to just
// flip a local "sent" flag with nothing saved anywhere, that was never
// true and has been fixed.
export default function ContactForm({ settings }) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  async function onSubmit(e) {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source: "contact_form" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Could not send your message, please try again.");
        setSending(false);
        return;
      }
      setSent(true);
    } catch {
      setError("Could not send your message, check your connection and try again.");
    }
    setSending(false);
  }

  return (
    <div className="wrap" style={{ paddingTop: 40, paddingBottom: 70 }}>
      <p className="eyebrow">Get in touch</p>
      <h1 style={{ fontSize: 30, marginBottom: 26 }}>Contact Zebra Motors</h1>
      <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 340px" }}>
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <div className="muted" style={{ fontSize: 12.5, marginBottom: 4 }}>Phone</div>
            <a href={telLink(settings)} style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>
              {settings.phoneDisplay}
            </a>
          </div>
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <div className="muted" style={{ fontSize: 12.5, marginBottom: 4 }}>Email</div>
            <a href={mailtoLink(settings)} style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>
              {settings.email}
            </a>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div className="muted" style={{ fontSize: 12.5, marginBottom: 4 }}>Location</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{settings.address}</div>
          </div>
        </div>

        <div style={{ flex: "1 1 400px", maxWidth: 480 }}>
          {sent ? (
            <div className="card" style={{ padding: 30, textAlign: "center" }}>
              <p style={{ fontSize: 15 }}>Thanks. We&apos;ll get back to you shortly.</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="field">
                <label>Name</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Message</label>
                <textarea
                  rows={5}
                  required
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  style={{ border: "1px solid var(--line)", padding: 12, fontFamily: "inherit", fontSize: 14 }}
                />
              </div>
              {error && <div className="confirm-note" style={{ display: "block" }}>{error}</div>}
              <button type="submit" className="btn-primary" disabled={sending}>
                {sending ? "Sending..." : "Send message"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
