// Section 3H, PWA. Deliberately conservative: this site's whole backend
// investment (Phase 3B onward) is that admin edits show up immediately,
// force-dynamic pages, no build-time snapshots. A service worker that
// cached pages or API responses would silently undo that. So this one
// only caches immutable, fingerprinted build assets and icons, never a
// page, never an API response, and only shows a static offline notice
// when the network genuinely is not reachable.
const CACHE_NAME = "zebra-static-v1";
const PRECACHE_URLS = ["/offline.html", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Next.js's own fingerprinted build output is safe to cache aggressively,
  // the filename changes whenever the content does.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // Page navigations: always try the network first (real, current data),
  // only fall back to the offline notice if there is truly no connection.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html"))
    );
    return;
  }

  // Everything else (API calls, admin routes, uploaded photos): network
  // only, never cached, so nothing stale or sensitive is ever served from
  // a shared cache.
});
