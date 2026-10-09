"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Home,
  ChevronRight,
  Minus,
  Plus,
  Check,
  User,
  Phone,
  Star,
  UtensilsCrossed,
  StickyNote,
} from "lucide-react";
import { API_URL, apiGet } from "@/lib/api";
import StarRating from "@/components/StarRating";
import SearchBar from "@/components/SearchBar";
import { useCart } from "@/components/site/CartContext";
import { SkeletonLine, SkeletonBlock } from "@/components/Skeleton";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

function DetailSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <SkeletonLine className="h-4 w-40" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <SkeletonBlock className="h-96" />
        <div className="space-y-4">
          <SkeletonLine className="h-8 w-3/4" />
          <SkeletonLine className="h-4 w-1/2" />
          <SkeletonLine className="h-4 w-full" />
          <SkeletonLine className="h-4 w-full" />
          <SkeletonLine className="h-4 w-2/3" />
          <SkeletonBlock className="h-14 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function MenuItemDetail() {
  const params = useParams();
  const slug = params.slug;
  const { addToCart } = useCart();

  const [item, setItem] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const it = await apiGet(`/api/v1/menu/slug/${slug}`);
        setItem(it);

        const [revs, rel] = await Promise.all([
          apiGet(`/api/v1/reviews/item-by-slug/${slug}?limit=20`).catch(() => []),
          apiGet(`/api/v1/menu/${it.id}/related?limit=4`).catch(() => []),
        ]);
        setReviews(revs);
        setRelated(rel);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    if (slug) load();
  }, [slug]);

  function handleAdd() {
    addToCart({
      cartId: "menu-" + item.id,
      item_id: item.id,
      name: item.name,
      unit_price: item.price,
      price: item.price,
      qty,
      is_custom_bowl: false,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  function openSearch() {
    if (typeof window !== "undefined" && window.__openSearch) {
      window.__openSearch();
    }
  }

  if (loading) return <DetailSkeleton />;

  if (error || !item) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-brand-card border border-gray-800 flex items-center justify-center mx-auto">
            <UtensilsCrossed
              className="w-8 h-8 text-gray-600"
              aria-hidden="true"
            />
          </div>
          <h1 className="font-heading text-2xl font-extrabold text-white mt-4">
            Item not found
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            {error || "This dish doesn't exist or was removed."}
          </p>
          <Link
            href="/menu"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl bg-brand-gold text-brand-dark font-bold"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Back to menu
          </Link>
        </div>
      </div>
    );
  }

  // Structured data
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: item.name,
    description: item.description,
    image: item.image_url?.startsWith("http")
      ? item.image_url
      : `${SITE_URL}${item.image_url || "/og-image.png"}`,
    sku: `MRF-${item.id}`,
    category: "Food & Beverage",
    brand: { "@type": "Brand", name: "Mr. Robert's Fries" },
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/menu/${item.slug}`,
      priceCurrency: "GHS",
      price: item.price.toFixed(2),
      availability: item.is_available
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "Mr. Robert's Fries" },
    },
  };
  if (item.total_reviews > 0 && item.average_rating > 0) {
    productSchema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: item.average_rating.toFixed(1),
      reviewCount: item.total_reviews,
      bestRating: 5,
      worstRating: 1,
    };
  }
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Menu",
        item: `${SITE_URL}/menu`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: item.name,
        item: `${SITE_URL}/menu/${item.slug}`,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-brand-dark text-gray-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <header className="sticky top-0 z-40 bg-brand-dark/95 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <Link
            href="/menu"
            className="inline-flex items-center gap-2 text-sm font-bold text-gray-300 hover:text-brand-gold whitespace-nowrap transition-colors group"
          >
            <ArrowLeft
              className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
              aria-hidden="true"
            />
            <span className="hidden sm:inline">Back to menu</span>
            <span className="sm:hidden">Back</span>
          </Link>
          <div className="flex-1 max-w-sm mx-auto hidden sm:block">
            <SearchBar onClick={openSearch} />
          </div>
          <div className="flex items-center gap-2">
            <div className="sm:hidden">
              <SearchBar onClick={openSearch} compact />
            </div>
            <Link
              href="/account"
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-brand-card border border-gray-700 text-white hover:border-brand-gold transition-colors"
            >
              <User className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Account</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <nav
          className="flex items-center gap-1.5 text-xs text-gray-500 mb-6 flex-wrap"
          aria-label="Breadcrumb"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-1 hover:text-brand-gold transition-colors"
          >
            <Home className="w-3 h-3" aria-hidden="true" />
            Home
          </Link>
          <ChevronRight className="w-3 h-3" aria-hidden="true" />
          <Link href="/menu" className="hover:text-brand-gold transition-colors">
            Menu
          </Link>
          <ChevronRight className="w-3 h-3" aria-hidden="true" />
          <span className="text-gray-300 truncate">{item.name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="rounded-3xl overflow-hidden border border-gray-700 bg-brand-card">
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={`${item.name} — loaded fries from Mr. Robert's Fries Accra`}
                className="w-full h-96 object-cover"
                loading="eager"
                fetchPriority="high"
              />
            ) : (
              <div className="w-full h-96 flex flex-col items-center justify-center bg-gray-800 text-gray-500 gap-2">
                <UtensilsCrossed className="w-10 h-10" aria-hidden="true" />
                No image
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div>
              {item.tags?.length > 0 && (
                <div className="flex gap-2 mb-2 flex-wrap">
                  {item.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] px-2 py-1 rounded-full bg-brand-gold/10 text-brand-gold border border-brand-gold/30 font-bold uppercase"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-white">
                {item.name}
              </h1>
              {item.total_reviews > 0 && (
                <div className="mt-2">
                  <StarRating
                    rating={item.average_rating}
                    size="md"
                    showValue
                    count={item.total_reviews}
                  />
                </div>
              )}
            </div>

            <p className="text-gray-300 text-sm leading-relaxed">
              {item.description}
            </p>

            <div className="text-3xl font-black text-brand-gold">
              GH₵ {item.price.toFixed(2)}
            </div>

            {!item.is_available ? (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-bold">
                Currently out of stock
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                    Quantity
                  </span>
                  <div className="inline-flex items-center gap-1 bg-brand-card px-1 py-1 rounded-xl border border-gray-700">
                    <button
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      aria-label="Decrease quantity"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-white font-bold w-8 text-center">
                      {qty}
                    </span>
                    <button
                      onClick={() => setQty(qty + 1)}
                      aria-label="Increase quantity"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleAdd}
                  className={`w-full py-4 rounded-2xl font-extrabold transition-all inline-flex items-center justify-center gap-2 active:scale-[0.99] ${
                    added
                      ? "bg-emerald-600 text-white"
                      : "bg-gradient-to-r from-brand-gold to-brand-amber hover:from-brand-amber hover:to-brand-gold text-brand-dark"
                  }`}
                >
                  {added ? (
                    <>
                      <Check className="w-5 h-5" aria-hidden="true" />
                      Added to Cart
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" aria-hidden="true" />
                      Add {qty} — GH₵ {(item.price * qty).toFixed(2)}
                    </>
                  )}
                </button>

                <p className="text-[11px] text-gray-500 text-center">
                  Your cart is saved on this device. Checkout from any page.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Reviews */}
        <section className="mb-12">
          <h2 className="font-heading text-2xl font-extrabold text-white mb-6 inline-flex items-center gap-2">
            <Star
              className="w-5 h-5 text-brand-gold fill-brand-gold"
              aria-hidden="true"
            />
            Customer Reviews
            {reviews.length > 0 && (
              <span className="text-sm text-gray-400 font-normal">
                ({reviews.length})
              </span>
            )}
          </h2>

          {reviews.length === 0 ? (
            <div className="bg-brand-card border border-gray-700 rounded-2xl p-8 text-center">
              <p className="text-gray-400 text-sm">
                No reviews yet — be the first to review this dish after your
                next order!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((r) => (
                <div
                  key={r.id}
                  className="bg-brand-card border border-gray-700 rounded-2xl p-5"
                >
                  <div className="flex justify-between items-start mb-2">
                    <StarRating rating={r.rating} size="sm" />
                    <span className="text-[10px] text-gray-500">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {r.comment && (
                    <p className="text-sm text-gray-200 whitespace-pre-wrap">
                      {r.comment}
                    </p>
                  )}
                  {r.photo_urls?.length > 0 && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {r.photo_urls.map((u, i) => (
                        <a key={i} href={u} target="_blank" rel="noreferrer">
                          <img
                            src={u}
                            alt={`Customer photo of ${item.name}`}
                            className="w-16 h-16 rounded-lg object-cover border border-gray-700 hover:opacity-80 transition-opacity"
                            loading="lazy"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Related */}
        {related.length > 0 && (
          <section>
            <h2 className="font-heading text-2xl font-extrabold text-white mb-6">
              You Might Also Like
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map((it) => (
                <Link
                  key={it.id}
                  href={`/menu/${it.slug}`}
                  className="bg-brand-card border border-gray-700 rounded-2xl overflow-hidden hover:border-brand-gold/60 hover:-translate-y-0.5 transition-all group"
                >
                  <div className="h-32 overflow-hidden">
                    {it.image_url && (
                      <img
                        src={it.image_url}
                        alt={`${it.name} at Mr. Robert's Fries`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-white text-sm leading-tight line-clamp-2 group-hover:text-brand-gold transition-colors">
                      {it.name}
                    </h3>
                    <div className="text-brand-gold font-bold text-sm mt-2">
                      GH₵ {it.price.toFixed(2)}
                    </div>
                    {it.total_reviews > 0 && (
                      <div className="mt-1">
                        <StarRating
                          rating={it.average_rating}
                          size="sm"
                          showValue
                          count={it.total_reviews}
                        />
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}