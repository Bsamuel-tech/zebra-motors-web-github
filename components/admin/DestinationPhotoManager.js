"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

// Real photo upload, talks to /api/destinations/[id]/photos. The same
// pattern as VehiclePhotoManager.js. Until a real photo is uploaded here,
// the public site shows the grey placeholder for this destination, nothing
// here fabricates or stands in a stock or generated image.
export default function DestinationPhotoManager({ destinationId, photos }) {
  const router = useRouter();
  const fileInput = useRef(null);
  const [altText, setAltText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState(null);
  const [error, setError] = useState("");

  async function onUpload(e) {
    e.preventDefault();
    const file = fileInput.current?.files?.[0];
    if (!file) {
      setError("Choose an image file first.");
      return;
    }
    setUploading(true);
    setError("");
    const form = new FormData();
    form.append("file", file);
    form.append("altText", altText);
    const res = await fetch(`/api/destinations/${destinationId}/photos`, { method: "POST", body: form });
    setUploading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Could not upload this photo.");
      return;
    }
    setAltText("");
    if (fileInput.current) fileInput.current.value = "";
    router.refresh();
  }

  async function setPrimary(photo) {
    setPending(photo.id);
    await fetch(`/api/destinations/${destinationId}/photos/${photo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPrimary: true }),
    });
    setPending(null);
    router.refresh();
  }

  async function remove(photo) {
    if (!confirm("Delete this photo? This cannot be undone.")) return;
    setPending(photo.id);
    await fetch(`/api/destinations/${destinationId}/photos/${photo.id}`, { method: "DELETE" });
    setPending(null);
    router.refresh();
  }

  return (
    <div style={{ maxWidth: 640, marginTop: 8 }}>
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Photos</h2>

      {photos.length === 0 && (
        <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
          No real photos uploaded yet, the public site shows the grey placeholder for this
          destination until one is added here.
        </p>
      )}

      {photos.length > 0 && (
        <div className="grid-3" style={{ gap: 12, marginBottom: 20 }}>
          {photos.map((p) => (
            <div key={p.id} className="card" style={{ overflow: "hidden" }}>
              <img src={p.url} alt={p.altText} style={{ width: "100%", height: 110, objectFit: "cover", display: "block" }} />
              <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                {p.isPrimary ? (
                  <span className="badge badge-forest" style={{ textAlign: "center" }}>
                    Primary (hero image)
                  </span>
                ) : (
                  <button
                    onClick={() => setPrimary(p)}
                    disabled={pending === p.id}
                    style={{ background: "none", border: "1px solid var(--line)", padding: "5px 8px", fontSize: 11.5, cursor: "pointer" }}
                  >
                    Set as hero image
                  </button>
                )}
                <button
                  onClick={() => remove(p)}
                  disabled={pending === p.id}
                  style={{ background: "none", border: "1px solid var(--line)", padding: "5px 8px", fontSize: 11.5, cursor: "pointer", color: "#a33" }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={onUpload} style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 380 }}>
        <div className="field">
          <label>Upload a photo (JPEG, PNG, or WebP, 8MB max)</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" ref={fileInput} />
        </div>
        <div className="field">
          <label>Alt text (for accessibility)</label>
          <input type="text" value={altText} onChange={(e) => setAltText(e.target.value)} />
        </div>
        {error && <div className="confirm-note" style={{ display: "block" }}>{error}</div>}
        <div>
          <button type="submit" className="btn-primary" disabled={uploading}>
            {uploading ? "Uploading..." : "Upload photo"}
          </button>
        </div>
      </form>
    </div>
  );
}
