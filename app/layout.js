import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata = {
  metadataBase: new URL("https://zebramotors.rw"),
  title: "Zebra Motors: Car Rental and Mobility Services in Rwanda",
  description:
    "Self-drive or chauffeur-driven car rental in Kigali, Rwanda. Airport pickup and travel packages, based in Kigali.",
  openGraph: {
    title: "Zebra Motors: Car Rental and Mobility Services in Rwanda",
    description:
      "Self-drive or chauffeur-driven car rental in Kigali, Rwanda. Airport pickup and travel packages, based in Kigali.",
    url: "https://zebramotors.rw",
    siteName: "Zebra Motors",
    locale: "en_US",
    type: "website",
    // No image set here on purpose, there is no real photography yet
    // (Rule 5), a placeholder graphic would be a worse first impression
    // in a social share than no image at all.
  },
};

// Bare shell only. The customer-facing Header and Footer live in
// app/(site)/layout.js instead of here, so the /admin section (which uses
// its own layout, app/admin/layout.js) does not inherit the public site's
// navigation chrome.
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
