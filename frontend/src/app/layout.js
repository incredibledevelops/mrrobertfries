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
    default:
      "Mr. Robert's Fries | Accra's #1 Loaded Fries & Crispy Chicken Delivery",
    template: "%s | Mr. Robert's Fries",
  },
  description:
    "Order Ghana's most loved loaded fries, crispy chicken wings, yam chips & custom bowls. Fresh, hot, delivered fast to East Legon, UG Legon, UPSA, Madina & KNUST. Pay with MoMo.",
  keywords: [
    "loaded fries Accra",
    "fries delivery Ghana",
    "chicken and chips Accra",
    "food delivery East Legon",
    "UG Legon food delivery",
    "UPSA food delivery",
    "KNUST food delivery",
    "yam chips Ghana",
    "Mr Robert's Fries",
    "MoMo food delivery",
  ],
  authors: [{ name: "Mr. Robert's Fries" }],
  creator: "Mr. Robert's Fries",
  publisher: "Mr. Robert's Fries",
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    locale: "en_GH",
    url: SITE_URL,
    siteName: "Mr. Robert's Fries",
    title: "Mr. Robert's Fries | Accra's #1 Loaded Fries",
    description:
      "Ghana's most loved loaded fries and crispy chicken. Delivered hot to Accra & Kumasi. Pay with MoMo.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Mr. Robert's Fries — Loaded Fries Loaded to Perfection",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mr. Robert's Fries | Accra's #1 Loaded Fries",
    description:
      "Ghana's most loved loaded fries. Delivered hot to Accra & Kumasi.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MR Fries",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
};

export const viewport = {
  themeColor: "#F59E0B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

/**
 * Restaurant structured data.
 * Update `address`, `telephone`, and `branch` list if they change.
 */
const RESTAURANT_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  name: "Mr. Robert's Fries",
  url: SITE_URL,
  image: `${SITE_URL}/og-image.png`,
  servesCuisine: ["Fast Food", "Ghanaian", "Chicken"],
  priceRange: "GH₵₵",
  telephone: "+233599233488",
  areaServed: [
    "East Legon",
    "UG Legon",
    "UPSA",
    "Madina",
    "Adenta",
    "Adjiringanor",
    "KNUST",
    "Bomso",
    "Ayeduase",
  ],
  address: [
    {
      "@type": "PostalAddress",
      streetAddress: "Boundary Road, East Legon",
      addressLocality: "Accra",
      addressRegion: "Greater Accra",
      addressCountry: "GH",
    },
    {
      "@type": "PostalAddress",
      streetAddress: "Bomso Road, near KNUST",
      addressLocality: "Kumasi",
      addressRegion: "Ashanti",
      addressCountry: "GH",
    },
  ],
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: "11:00",
      closes: "23:00",
    },
  ],
  sameAs: [
    "https://www.instagram.com/mrobertfries/",
  ],
  potentialAction: {
    "@type": "OrderAction",
    target: `${SITE_URL}/menu`,
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en-GH"
      className={`${outfit.variable} ${jakarta.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Preconnect for speed */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://js.paystack.co" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(RESTAURANT_SCHEMA),
          }}
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <ClientShell>
          <SiteShell>{children}</SiteShell>
        </ClientShell>
        <Script
          src="https://js.paystack.co/v1/inline.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}