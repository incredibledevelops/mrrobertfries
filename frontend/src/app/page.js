"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { useBranch } from "@/components/site/BranchContext";
import { useCart } from "@/components/site/CartContext";
import FeaturedReviews from "@/components/FeaturedReviews";

export default function HomePage() {
  const { activeBranchId, activeBranch } = useBranch();
  const { addToCart } = useCart();
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeBranchId) return;
    (async () => {
      try {
        const items = await apiGet(
          `/api/v1/menu?available_only=true&branch_id=${activeBranchId}`
        );
        setFeatured(items.slice(0, 3));
      } catch {}
      finally {
        setLoading(false);
      }
    })();
  }, [activeBranchId]);

  return (
    <>
      {/* HERO */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-brand-dark to-brand-card/30">
        <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-block px-3 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-xs font-bold uppercase">
              ✨ {activeBranch?.name || "Accra's Most Loved Loaded Fries"}
            </div>
            <h1 className="font-heading text-4xl sm:text-6xl font-extrabold text-white leading-tight">
              Crispy Fries. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-gold via-brand-amber to-brand-crimson">
                Loaded to Perfection.
              </span>
            </h1>
            <p className="text-gray-300 max-w-xl">
              Hand-cut golden fries, Ghanaian fried yam, signature sauces, and
              juicy chicken wings. Delivered fresh to your campus or doorstep!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                href="/menu"
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-amber to-brand-crimson text-white font-bold text-center"
              >
                Order Now →
              </Link>
              <Link
                href="/builder"
                className="px-8 py-4 rounded-2xl bg-brand-card border border-brand-gold/40 text-brand-gold font-bold text-center"
              >
                🧑‍🍳 Build Custom Bowl
              </Link>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="rounded-3xl overflow-hidden border border-gray-700 bg-brand-card">
              <img
                src="https://encrypted-tbn3.gstatic.com/licensed-image?q=tbn:ANd9GcT4fXp6OHCfxjVnbIHWOHfsiOktpG4AYONDnsMb18_4Z-7E-RamGG9gPgnEJ9xvQGoK7CHw0GlhXicDwUA"
                alt="Mr. Robert's Fries loaded fry bowl"
                className="w-full h-80 object-cover"
                loading="eager"
              />
              <div className="p-6">
                <div className="text-xs text-brand-gold font-bold uppercase tracking-widest">
                  Signature
                </div>
                <h3 className="font-heading font-bold text-lg text-white mt-1">
                  The Robert Special Bowl
                </h3>
                <p className="text-xs text-gray-400">
                  Loaded Chicken, Cheddar, Shito Aioli & Fries
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED ITEMS */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="font-heading text-3xl font-extrabold text-white">
                Featured Today
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Our most-loved dishes at {activeBranch?.name || "your branch"}.
              </p>
            </div>
            <Link
              href="/menu"
              className="hidden sm:inline-block text-brand-gold hover:underline text-sm font-bold"
            >
              See full menu →
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-brand-card rounded-2xl border border-gray-700 overflow-hidden"
                >
                  <div className="h-48 bg-gray-800 animate-pulse" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 w-2/3 bg-gray-700/60 rounded animate-pulse" />
                    <div className="h-3 w-full bg-gray-700/40 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map((item) => (
                <div
                  key={item.id}
                  className="bg-brand-card rounded-2xl border border-gray-700 overflow-hidden flex flex-col hover:border-brand-gold/60 transition-colors"
                >
                  <Link href={`/menu/${item.slug}`}>
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute top-3 right-3 bg-brand-dark/90 px-3 py-1 rounded-xl text-brand-gold font-extrabold text-sm border border-gray-700">
                        GH₵ {item.price.toFixed(2)}
                      </div>
                    </div>
                  </Link>
                  <div className="p-5 flex-1">
                    <Link href={`/menu/${item.slug}`}>
                      <h3 className="font-heading font-bold text-lg text-white hover:text-brand-gold transition-colors">
                        {item.name}
                      </h3>
                    </Link>
                    <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                  <div className="p-5 pt-0">
                    <button
                      onClick={() =>
                        addToCart({
                          cartId: "menu-" + item.id,
                          item_id: item.id,
                          name: item.name,
                          unit_price: item.price,
                          price: item.price,
                          is_custom_bowl: false,
                        })
                      }
                      className="w-full py-3 rounded-xl bg-gray-800 hover:bg-brand-crimson text-white font-bold text-xs transition-colors"
                    >
                      + Add to Order
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="sm:hidden mt-6 text-center">
            <Link
              href="/menu"
              className="inline-block px-6 py-3 rounded-xl bg-brand-gold text-brand-dark font-extrabold text-sm"
            >
              See full menu →
            </Link>
          </div>
        </div>
      </section>

      {/* BUILDER TEASER */}
      <section className="py-16 bg-brand-card/40 border-y border-gray-800">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <span className="text-brand-gold font-bold text-xs uppercase tracking-widest bg-brand-gold/10 px-3 py-1 rounded-full border border-brand-gold/20">
            DIY Feast
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white mt-3">
            Build Your Own Fry Bowl
          </h2>
          <p className="text-gray-400 mt-3 max-w-xl mx-auto">
            Pick your base, stack on proteins, choose your sauce, and add
            toppings. Your perfect bowl, your way.
          </p>
          <Link
            href="/builder"
            className="inline-block mt-6 px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-gold to-brand-amber text-brand-dark font-extrabold"
          >
            🧑‍🍳 Start Building
          </Link>
        </div>
      </section>

      {/* FEATURED REVIEWS */}
      <FeaturedReviews />

      {/* LOCATIONS TEASER */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-heading text-3xl font-extrabold text-white">
              We Deliver Where You Are
            </h2>
            <p className="text-gray-300 mt-3">
              From UG Legon campus to East Legon offices, from Madina to KNUST
              — our riders bring hot fries straight to your door.
            </p>
            <Link
              href="/locations"
              className="inline-block mt-6 px-6 py-3 rounded-xl bg-brand-gold text-brand-dark font-extrabold text-sm"
            >
              See all delivery areas →
            </Link>
          </div>
          <div className="bg-gradient-to-br from-brand-card to-gray-900 p-8 rounded-3xl border border-gray-700">
            <h3 className="font-heading text-xl font-extrabold text-white mb-4">
              Order Hotline
            </h3>
            <div className="space-y-3 text-sm text-gray-300">
              <div>💳 MoMo, Telecel Cash, AT Money, card via Paystack</div>
              <div>🚚 Also available on Hubtel and Glovo</div>
              <div>🕒 Mon–Sun: 11:00 – 23:00</div>
              <div>📞 0599233488</div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}