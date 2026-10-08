import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import ClientShell from "@/components/ClientShell";
import SiteShell from "@/components/site/SiteShell";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Mr. Robert's Fries | Accra's #1 Loaded Fries & Crispy Chicken Delivery",
    template: "%s | Mr. Robert's Fries",
  },
  description:
    "Order Ghana's most loved loaded fries, crispy chicken wings, yam chips & custom bowls. Fresh, hot, delivered fast to East Legon, UG Legon, UPSA, Madina & KNUST. Pay with MoMo.",
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    locale: "en_GH",
    url: SITE_URL,
    siteName: "Mr. Robert's Fries",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "MR Fries" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
};

export const viewport = {
  themeColor: "#F59E0B",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en-GH"
      className={`${outfit.variable} ${jakarta.variable}`}
      suppressHydrationWarning
    >
      <head>
        <Script src="https://js.paystack.co/v1/inline.js" strategy="afterInteractive" />
        <Script src="https://unpkg.com/lucide@latest" strategy="afterInteractive" />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <ClientShell>
          <SiteShell>{children}</SiteShell>
        </ClientShell>
      </body>
    </html>
  );
}