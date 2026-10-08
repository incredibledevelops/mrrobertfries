"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { API_URL, apiGet } from "@/lib/api";
import StarRating from "@/components/StarRating";
import SearchBar from "@/components/SearchBar";
import { SkeletonLine, SkeletonBlock } from "@/components/Skeleton";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

function DetailSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <SkeletonLine className="h-4 w-24" />
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

  function addToCart() {
    try {
      const raw = localStorage.getItem("mrf_cart") || "[]";
      const cart = JSON.parse(raw);
      const cartId = "menu-" + item.id;
      const existing = cart.find((c) => c.cartId === cartId);
      if (existing) {
        existing.qty += qty;
      } else {
        cart.push({
          cartId,
          item_id: item.id,
          name: item.name,
          unit_price: item.price,
          price: item.price,
          qty,
          is_custom_bowl: false,
        });
      }
      localStorage.setItem("mrf_cart", JSON.stringify(cart));
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
      window.dispatchEvent(new Event("mrf-cart-updated"));
    } catch (e) {
      alert("Could not add to cart: " + e.message);
    }
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
          <div className="text-5xl">🍟</div>
          <h1 className="font-heading text-2xl font-extrabold text-white mt-4">
            Item not found
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            {error || "This dish doesn't exist or was removed."}
          </p>
          <Link
            href="/"
            className="inline-block mt-6 px-6 py-3 rounded-xl bg-brand-gold text-brand-dark font-bold"
          >
            ← Back to menu
          </Link>
        </div>
      </div>
    );
  }

  // ---------- Structured Data: Product + Breadcrumb ----------
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
    brand: {
      "@type": "Brand",
      name: "Mr. Robert's Fries",
    },
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/menu/${item.slug}`,
      priceCurrency: "GHS",
      price: item.price.toFixed(2),
      availability: item.is_available
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: "Mr. Robert's Fries",
      },
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
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Menu",
        item: `${SITE_URL}/#menu`,
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
            href="/"
            className="flex items-center gap-2 text-sm font-bold text-gray-300 hover:text-brand-gold whitespace-nowrap"
          >
            ← Back
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
              className="text-xs font-bold px-3 py-2 rounded-lg bg-brand-card border border-gray-700 text-white"
            >
              Account
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <nav className="text-xs text-gray-500 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-brand-gold">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/#menu" className="hover:text-brand-gold">
            Menu
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-300">{item.name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="rounded-3xl overflow-hidden border border-gray-700 bg-brand-card">
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={`${item.name} — loaded fries from Mr. Robert's Fries Accra`}
                className="w-full h-96 object-cover"
                loading="eager"
              />
            ) : (
              <div className="w-full h-96 flex items-center justify-center bg-gray-800 text-gray-500">
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

            {!item.is_available && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-bold">
                Out of stock
              </div>
            )}

            {item.is_available && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 font-bold">
                    Quantity:
                  </span>
                  <div className="flex items-center gap-2 bg-brand-card px-3 py-2 rounded-xl border border-gray-700">
                    <button
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      className="text-gray-400 hover:text-white font-bold px-1"
                    >
                      −
                    </button>
                    <span className="text-white font-bold w-6 text-center">
                      {qty}
                    </span>
                    <button
                      onClick={() => setQty(qty + 1)}
                      className="text-gray-400 hover:text-white font-bold px-1"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  onClick={addToCart}
                  className={`w-full py-4 rounded-2xl font-extrabold transition-colors ${
                    added
                      ? "bg-emerald-600 text-white"
                      : "bg-gradient-to-r from-brand-gold to-brand-amber text-brand-dark hover:from-brand-amber hover:to-brand-gold"
                  }`}
                >
                  {added ? "✓ Added to Cart" : `+ Add ${qty} to Order`}
                </button>

                <p className="text-[11px] text-gray-500 text-center">
                  Your cart is saved on this device. Checkout from the home page.
                </p>
              </div>
            )}
          </div>
        </div>

        <section className="mb-12">
          <h2 className="font-heading text-2xl font-extrabold text-white mb-6">
            Customer Reviews
            {reviews.length > 0 && (
              <span className="text-sm text-gray-400 font-normal ml-3">
                {reviews.length} total
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
                            className="w-16 h-16 rounded-lg object-cover border border-gray-700 hover:opacity-80"
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
                  className="bg-brand-card border border-gray-700 rounded-2xl overflow-hidden hover:border-brand-gold/60 transition-colors group"
                >
                  <div className="h-32 overflow-hidden">
                    {it.image_url && (
                      <img
                        src={it.image_url}
                        alt={`${it.name} at Mr. Robert's Fries`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-white text-sm leading-tight line-clamp-2">
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