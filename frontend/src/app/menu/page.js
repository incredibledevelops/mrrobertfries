"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { useBranch } from "@/components/site/BranchContext";
import { useCart } from "@/components/site/CartContext";
import SearchBar from "@/components/SearchBar";
import {
  MenuGridSkeleton,
  CategoryTabsSkeleton,
} from "@/components/Skeleton";

export default function MenuPage() {
  const { activeBranchId, activeBranch } = useBranch();
  const { addToCart } = useCart();

  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeBranchId) return;
    setLoading(true);
    (async () => {
      try {
        const [m, c] = await Promise.all([
          apiGet(`/api/v1/menu?available_only=true&branch_id=${activeBranchId}`),
          apiGet("/api/v1/categories?active_only=true"),
        ]);
        setMenu(m);
        setCategories(c);
      } finally {
        setLoading(false);
      }
    })();
  }, [activeBranchId]);

  const visible = useMemo(() => {
    let items = menu;
    if (activeCategory !== "all") {
      items = items.filter((item) => {
        const cat = categories.find((c) => c.id === item.category_id);
        return cat?.slug === activeCategory;
      });
    }
    if (query.trim()) {
      const s = query.toLowerCase();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(s) ||
          (i.description || "").toLowerCase().includes(s)
      );
    }
    return items;
  }, [menu, categories, activeCategory, query]);

  function openSearch() {
    if (typeof window !== "undefined" && window.__openSearch) {
      window.__openSearch();
    }
  }

  return (
    <>
      {/* Page header */}
      <section className="py-12 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="text-xs text-gray-500 mb-3">
            <Link href="/" className="hover:text-brand-gold">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-300">Menu</span>
          </nav>
          <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-white">
            Our Menu
          </h1>
          <p className="text-gray-400 mt-2">
            Fresh from the kitchen at {activeBranch?.name || "your branch"}.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="py-8 border-b border-gray-800 sticky top-[var(--header-height,80px)] bg-brand-dark/95 backdrop-blur-md z-30">
        <div className="max-w-7xl mx-auto px-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search dishes…"
              className="flex-1 px-4 py-3 rounded-xl bg-brand-card border border-gray-700 text-white text-sm outline-none focus:border-brand-gold"
            />
            <button
              onClick={openSearch}
              className="hidden sm:flex px-4 py-3 rounded-xl bg-brand-card border border-gray-700 text-gray-400 text-xs font-bold hover:border-brand-gold"
            >
              ⌘K Global Search
            </button>
          </div>

          {loading ? (
            <CategoryTabsSkeleton />
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              <button
                onClick={() => setActiveCategory("all")}
                className={`px-4 py-2 rounded-xl font-bold text-xs whitespace-nowrap ${
                  activeCategory === "all"
                    ? "bg-brand-gold text-brand-dark"
                    : "bg-brand-card text-gray-300 border border-gray-700"
                }`}
              >
                All Items ({menu.length})
              </button>
              {categories.map((cat) => {
                const count = menu.filter((m) => m.category_id === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.slug)}
                    className={`px-4 py-2 rounded-xl font-bold text-xs whitespace-nowrap ${
                      activeCategory === cat.slug
                        ? "bg-brand-gold text-brand-dark"
                        : "bg-brand-card text-gray-300 border border-gray-700"
                    }`}
                  >
                    {cat.name} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Items */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          {loading ? (
            <MenuGridSkeleton count={6} />
          ) : visible.length === 0 ? (
            <div className="bg-brand-card border border-gray-700 rounded-2xl p-12 text-center">
              <div className="text-4xl mb-3">🍟</div>
              <p className="text-gray-400">
                {query ? `No items match "${query}"` : "No items available."}
              </p>
              <Link
                href="/"
                className="inline-block mt-4 px-5 py-2 rounded-xl bg-brand-gold text-brand-dark font-bold text-sm"
              >
                Back to Home
              </Link>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500 mb-6">
                Showing {visible.length} item{visible.length === 1 ? "" : "s"}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {visible.map((item) => (
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
                        {item.total_reviews > 0 && (
                          <div className="absolute top-3 left-3 bg-brand-dark/90 px-2 py-1 rounded-lg flex items-center gap-1 text-xs font-bold border border-gray-700">
                            <span className="text-brand-gold">★</span>
                            <span className="text-white">
                              {item.average_rating.toFixed(1)}
                            </span>
                            <span className="text-gray-500">
                              ({item.total_reviews})
                            </span>
                          </div>
                        )}
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
                        className="w-full py-3 rounded-xl bg-gray-800 hover:bg-brand-crimson text-white font-bold text-xs"
                      >
                        + Add to Order
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}