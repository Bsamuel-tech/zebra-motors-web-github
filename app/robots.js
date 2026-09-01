// Section 3E, SEO. Keeps the admin panel, customer accounts, the API, and
// the login page out of search results, everything customer-facing stays
// crawlable.
export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/api", "/login"],
    },
    sitemap: "https://zebramotors.rw/sitemap.xml",
  };
}
