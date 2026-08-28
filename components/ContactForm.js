"use client";

import { useState } from "react";
import { telLink, mailtoLink } from "@/data/settings";

// settings is passed down from the server component at
// app/(site)/contact/page.js (Phase 3B, database-backed).
export default function ContactForm({ settings }) {
  const [sent, setSent] = useState(false);

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
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <div className="field">
                <label>Name</label>
                <input required />
              </div>
              <div className="field">
                <label>Email</label>
                <input type="email" required />
              </div>
              <div className="field">
                <label>Message</label>
                <textarea rows={5} required style={{ border: "1px solid var(--line)", padding: 12, fontFamily: "inherit", fontSize: 14 }} />
              </div>
              <button type="submit" className="btn-primary">
                Send message
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
