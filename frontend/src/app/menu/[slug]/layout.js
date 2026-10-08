import { API_URL } from "@/lib/api";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

async function getItem(slug) {
  try {
    const res = await fetch(`${API_URL}/api/v1/menu/slug/${slug}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const item = await getItem(slug);

  if (!item) {
    return {
      title: "Menu Item",
    };
  }

  const title = `${item.name} — GH₵ ${item.price.toFixed(2)}`;
  const description =
    item.description?.slice(0, 155) ||
    `Order ${item.name} from Mr. Robert's Fries. Fresh, hot, delivered in Accra & Kumasi.`;

  const imageUrl = item.image_url?.startsWith("http")
    ? item.image_url
    : `${SITE_URL}${item.image_url || "/og-image.png"}`;

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/menu/${item.slug}`,
    },
    openGraph: {
      type: "website",
      url: `${SITE_URL}/menu/${item.slug}`,
      title: `${item.name} — Mr. Robert's Fries`,
      description,
      siteName: "Mr. Robert's Fries",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: item.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${item.name} — Mr. Robert's Fries`,
      description,
      images: [imageUrl],
    },
  };
}

export default function MenuItemLayout({ children }) {
  return children;
}