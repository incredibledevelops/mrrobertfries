"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Home,
  ChevronRight,
  Search,
  Command,
  UtensilsCrossed,
  Plus,
  Star,
  Filter,
  X,
} from "lucide-react";
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

  const hasFilters = activeCategory !== "all" || query.trim();

  function clearFilters() {
    setActiveCategory("all");
    setQuery("");
  }

  return (
    <>
      {/* Page header */}
      <section className="py-10 sm:py-14 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <nav
            className="flex items-center gap-1.5 text-xs text-gray-500 mb-3"
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
            <span className="text-gray-300">Menu</span>
          </nav>
          <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-white">
            Our Menu
          </h1>
          <p className="text-gray-400 mt-2 text-sm sm:text-base">
            Fresh from the kitchen at{" "}
            <span className="text-brand-gold font-semibold">
              {activeBranch?.name || "your branch"}
            </span>
            .
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="py-4 border-b border-gray-800 bg-brand-dark/95 backdrop-blur-md sticky top-[88px] z-30">
        <div className="max-w-7xl mx-auto px-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search dishes…"
                aria-label="Search dishes"
                className="w-full pl-9 pr-10 py-3 rounded-xl bg-brand-card border border-gray-700 text-white text-sm outline-none focus:border-brand-gold transition-colors"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={openSearch}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-brand-card border border-gray-700 text-gray-300 hover:border-brand-gold hover:text-white text-xs font-bold transition-colors"
            >
              <Command className="w-3.5 h-3.5" aria-hidden="true" />
              Global search
              <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-[10px] font-mono">
                ⌘K
              </kbd>
            </button>
          </div>

          {loading ? (
            <CategoryTabsSkeleton />
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4">
              <button
                onClick={() => setActiveCategory("all")}
                aria-pressed={activeCategory === "all"}
                className={`px-4 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-colors ${
                  activeCategory === "all"
                    ? "bg-brand-gold text-brand-dark shadow-lg shadow-brand-gold/20"
                    : "bg-brand-card text-gray-300 border border-gray-700 hover:text-white hover:border-brand-gold/40"
                }`}
              >
                All ({menu.length})
              </button>
              {categories.map((cat) => {
                const count = menu.filter((m) => m.category_id === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.slug)}
                    aria-pressed={activeCategory === cat.slug}
                    className={`px-4 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-colors ${
                      activeCategory === cat.slug
                        ? "bg-brand-gold text-brand-dark shadow-lg shadow-brand-gold/20"
                        : "bg-brand-card text-gray-300 border border-gray-700 hover:text-white hover:border-brand-gold/40"
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
      <section className="py-10">
        <div className="max-w-7xl mx-auto px-4">
          {loading ? (
            <MenuGridSkeleton count={6} />
          ) : visible.length === 0 ? (
            <div className="bg-brand-card border border-gray-700 rounded-2xl p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                <UtensilsCrossed
                  className="w-8 h-8 text-gray-600"
                  aria-hidden="true"
                />
              </div>
              <p className="text-gray-300 font-bold">
                {query
                  ? `No items match "${query}"`
                  : "No items available for this filter."}
              </p>
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 mt-4 px-5 py-2 rounded-xl bg-brand-gold text-brand-dark font-bold text-sm"
              >
                <Filter className="w-4 h-4" aria-hidden="true" />
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500 mb-6 inline-flex items-center gap-1.5">
                <UtensilsCrossed className="w-3.5 h-3.5" aria-hidden="true" />
                Showing {visible.length} item{visible.length === 1 ? "" : "s"}
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="ml-2 text-brand-gold hover:underline font-bold"
                  >
                    Clear filters
                  </button>
                )}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {visible.map((item) => (
                  <MenuCard key={item.id} item={item} onAdd={addToCart} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}

function MenuCard({ item, onAdd }) {
  const [added, setAdded] = useState(false);

  function handleAdd() {
    onAdd({
      cartId: "menu-" + item.id,
      item_id: item.id,
      name: item.name,
      unit_price: item.price,
      price: item.price,
      is_custom_bowl: false,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="bg-brand-card rounded-2xl border border-gray-700 overflow-hidden flex flex-col hover:border-brand-gold/60 hover:-translate-y-0.5 transition-all group">
      <Link href={`/menu/${item.slug}`} className="block relative h-48 overflow-hidden">
        <img
          src={item.image_url}
          alt={`${item.name} at Mr. Robert's Fries`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div className="absolute top-3 right-3 bg-brand-dark/90 backdrop-blur-sm px-3 py-1.5 rounded-xl text-brand-gold font-extrabold text-sm border border-gray-700">
          GH₵ {item.price.toFixed(2)}
        </div>
        {item.total_reviews > 0 && (
          <div className="absolute top-3 left-3 bg-brand-dark/90 backdrop-blur-sm px-2 py-1 rounded-lg inline-flex items-center gap-1 text-xs font-bold border border-gray-700">
            <Star
              className="w-3 h-3 text-brand-gold fill-brand-gold"
              aria-hidden="true"
            />
            <span className="text-white">{item.average_rating.toFixed(1)}</span>
            <span className="text-gray-500">({item.total_reviews})</span>
          </div>
        )}
      </Link>

      <div className="p-5 flex-1 flex flex-col">
        <Link href={`/menu/${item.slug}`}>
          <h3 className="font-heading font-bold text-lg text-white hover:text-brand-gold transition-colors line-clamp-2">
            {item.name}
          </h3>
        </Link>
        <p className="text-xs text-gray-400 mt-2 line-clamp-2 flex-1">
          {item.description}
        </p>
        <button
          onClick={handleAdd}
          aria-label={`Add ${item.name} to order`}
          className={`mt-4 w-full py-3 rounded-xl font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-colors ${
            added
              ? "bg-emerald-600 text-white"
              : "bg-gray-800 hover:bg-brand-crimson text-white"
          }`}
        >
          <Plus
            className={`w-4 h-4 transition-transform ${
              added ? "rotate-45" : ""
            }`}
            aria-hidden="true"
          />
          {added ? "Added" : "Add to Order"}
        </button>
      </div>
    </div>
  );
}