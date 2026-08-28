"use client";

import { useEffect } from "react";

// Section 3H, PWA. Registers public/sw.js once the page has loaded.
// Silently does nothing in browsers without service worker support
// (or in non-HTTPS local dev over a plain IP), this is progressive
// enhancement, not a requirement for the site to work.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }, []);
  return null;
}
