import { getVehicles } from "@/lib/db/vehicles";
import { getPackages } from "@/lib/db/packages";
import { getArticles } from "@/lib/db/guideArticles";

const BASE_URL = "https://zebramotors.rw";

// Without this, Next.js prerenders the sitemap once at build time (it did,
// verified during testing) and an admin archiving or adding a vehicle
// afterward would not be reflected until the next deploy, the same
// staleness bug already fixed elsewhere in this codebase for pages that
// read the database (see app/(site)/layout.js's own comment on this).
export const dynamic = "force-dynamic";

// Real dynamic sitemap (Section 3E, SEO). Static marketing pages plus every
// currently public vehicle, package, and Rwanda Guide article, generated
// from the same database the pages themselves read, so this can never list
// a vehicle that is not actually bookable or an article that is not
// actually published. /admin, /account, /api, and /login are deliberately
// excluded, see app/robots.js.
export default function sitemap() {
  const vehicles = getVehicles();
  const packages = getPackages({ publishedOnly: true });
  const articles = getArticles({ publishedOnly: true });
  const now = new Date();

  const staticRoutes = [
    { path: "", priority: 1 },
    { path: "/cars", priority: 0.9 },
    { path: "/plan-your-trip", priority: 0.8 },
    { path: "/chauffeur", priority: 0.7 },
    { path: "/airport-car-rental", priority: 0.7 },
    { path: "/packages", priority: 0.7 },
    { path: "/rwanda-guide", priority: 0.6 },
    { path: "/driving-in-rwanda", priority: 0.5 },
    { path: "/insurance", priority: 0.4 },
    { path: "/faq", priority: 0.5 },
    { path: "/about", priority: 0.4 },
    { path: "/contact", priority: 0.5 },
    { path: "/terms", priority: 0.2 },
    { path: "/privacy", priority: 0.2 },
  ].map((r) => ({
    url: `${BASE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: r.priority,
  }));

  const vehicleRoutes = vehicles.map((v) => ({
    url: `${BASE_URL}/cars/${v.id}`,
    lastModified: v.updatedAt ? new Date(v.updatedAt) : now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const packageRoutes = packages.map((p) => ({
    url: `${BASE_URL}/packages/${p.slug}`,
    lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const articleRoutes = articles.map((a) => ({
    url: `${BASE_URL}/rwanda-guide/${a.slug}`,
    lastModified: a.updatedAt ? new Date(a.updatedAt) : now,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...vehicleRoutes, ...packageRoutes, ...articleRoutes];
}
