// Section 3H, PWA. Makes the site installable. The icons in public/icons/
// are a plain placeholder (the site's own ink and sand colors with a "Z"),
// not a real logo, Zebra has not supplied brand assets yet, see the
// photography brief in the design system notes for the same gap. Swap
// these two files for real icons whenever branding exists, nothing else
// here needs to change.
export default function manifest() {
  return {
    name: "Zebra Motors: Car Rental and Mobility Services in Rwanda",
    short_name: "Zebra Motors",
    description:
      "Self-drive or chauffeur-driven car rental in Kigali, Rwanda. Airport pickup and travel packages.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf7f1",
    theme_color: "#1f4433",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
