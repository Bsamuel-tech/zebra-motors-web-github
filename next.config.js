// Baseline security headers (Phase 3, P0-6). This is a starting point, not
// a full hardening pass: a stricter, nonce-based Content-Security-Policy is
// worth revisiting once a real backend and API exist (Phase 3B onward),
// since script-src stays permissive here to avoid breaking Next.js's own
// inline hydration data and dev-mode tooling.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  // 'self data:' covers vehicle/destination photos and inline images.
  // The OpenStreetMap tile subdomains are added for components/TripRouteMap.js
  // (P2's real route map), the free OSM tile servers Zebra's mapping
  // provider choice uses, without this the map would render with no tiles
  // at all once a stop has a real coordinate (see lib/geo/provider.js).
  "img-src 'self' data: https://a.tile.openstreetmap.org https://b.tile.openstreetmap.org https://c.tile.openstreetmap.org",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

module.exports = nextConfig;
