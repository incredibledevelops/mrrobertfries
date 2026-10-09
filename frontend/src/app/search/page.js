"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search,
  SearchX,
  ArrowLeft,
  ArrowRight,
  Utensils,
  FolderOpen,
} from "lucide-react";
import { API_URL } from "@/lib/api";
import { useBranch } from "@/components/site/BranchContext";
import StarRating from "@/components/StarRating";
import { MenuGridSkeleton, SkeletonLine } from "@/components/Skeleton";

function SearchInner() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const { activeBranchId, activeBranch } = useBranch();

  const [input, setInput] = useState(q);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // noindex meta — search pages shouldn't be indexed by Google
  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]');
    let created = false;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "robots";
      document.head.appendChild(meta);
      created = true;
    }
    meta.content = "noindex, follow";
    return () => {
      if (created && meta) meta.remove();
    };
  }, []);

  // Fetch results whenever the query or branch changes
  useEffect(() => {
    setInput(q);

    if (!q.trim()) {
      setResults(null);
      setError("");
      return;
    }

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        q,
        limit: "50",
      });
      if (activeBranchId) params.set("branch_id", activeBranchId);

      const url = `${API_URL}/api/v1/search?${params.toString()}`;

      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
        }
        const data = await res.json();
        if (!cancelled) setResults(data);
      } catch (e) {
        if (!cancelled) {
          setError(e.message || "Search failed");
          setResults(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [q, activeBranchId]);

  function submit(e) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    window.location.href = `/search?q=${encodeURIComponent(trimmed)}`;
  }

  return (
    <div className="min-h-screen bg-brand-dark text-gray-100">
      {/* Header with search */}
      <header className="sticky top-0 z-40 bg-brand-dark/95 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-3">
          <Link
            href="/"
            aria-label="Back to home"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-300 hover:text-brand-gold whitespace-nowrap transition-colors group"
          >
            <ArrowLeft
              className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
              aria-hidden="true"
            />
            <span className="hidden sm:inline">Home</span>
          </Link>

          <form onSubmit={submit} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Search fries, wings, gizzard…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-brand-card border border-gray-700 text-white text-sm outline-none focus:border-brand-gold transition-colors"
                autoFocus
                aria-label="Search the menu"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark text-xs font-extrabold transition-colors"
            >
              Search
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* No query yet */}
        {!q ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-brand-card border border-gray-800 flex items-center justify-center mx-auto mb-4">
              <Search
                className="w-8 h-8 text-gray-600"
                aria-hidden="true"
              />
            </div>
            <h2 className="font-heading text-2xl font-extrabold text-white">
              Search our menu
            </h2>
            <p className="text-gray-400 mt-2 text-sm">
              Type something above to find your favorite dishes.
            </p>
            <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
              <span className="text-[10px] text-gray-600 uppercase tracking-wider font-bold">
                Try:
              </span>
              {["wings", "gizzard", "yam", "loaded"].map((term) => (
                <Link
                  key={term}
                  href={`/search?q=${encodeURIComponent(term)}`}
                  className="px-3 py-1.5 rounded-lg bg-gray-800 text-brand-gold text-xs font-mono hover:bg-gray-700 transition-colors"
                >
                  {term}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Query header */}
            <div className="mb-8">
              <div className="text-xs uppercase tracking-widest text-gray-500 font-bold">
                Search results for
              </div>
              <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-white mt-1">
                "{q}"
              </h1>
              <p className="text-gray-400 text-sm mt-1 inline-flex items-center gap-1.5 flex-wrap">
                <Utensils className="w-3.5 h-3.5" aria-hidden="true" />
                {results && !loading && !error
                  ? `${results.total} item${results.total === 1 ? "" : "s"} found`
                  : "Searching…"}
                {activeBranch?.name && (
                  <span className="text-gray-500">
                    · at {activeBranch.name}
                  </span>
                )}
              </p>
            </div>

            {loading && <MenuGridSkeleton count={6} />}

            {!loading && error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
                <div className="text-red-400 font-bold mb-2 inline-flex items-center gap-2">
                  <SearchX className="w-4 h-4" aria-hidden="true" />
                  Search failed
                </div>
                <div className="text-red-300 text-sm font-mono break-all">
                  {error}
                </div>
                <div className="text-gray-400 text-xs mt-3">
                  Make sure the backend is running at{" "}
                  <code className="text-brand-gold">{API_URL}</code>.
                </div>
              </div>
            )}

            {!loading && !error && results && results.items.length === 0 && (
              <div className="text-center py-20">
                <div className="w-20 h-20 rounded-full bg-brand-card border border-gray-800 flex items-center justify-center mx-auto mb-4">
                  <SearchX className="w-8 h-8 text-gray-600" aria-hidden="true" />
                </div>
                <p className="text-gray-300 font-bold">
                  No items found for "{q}"
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Try a different word, or{" "}
                  <Link href="/menu" className="text-brand-gold underline">
                    browse the full menu
                  </Link>
                </p>
              </div>
            )}

            {!loading && !error && results && results.items.length > 0 && (
              <>
                {results.categories?.length > 0 && (
                  <div className="mb-6 flex flex-wrap gap-2">
                    {results.categories.map((c) => (
                      <Link
                        key={c.id}
                        href={`/menu?category=${c.slug}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-card border border-gray-700 text-xs font-bold text-gray-200 hover:border-brand-gold transition-colors"
                      >
                        <FolderOpen
                          className="w-3.5 h-3.5 text-brand-gold"
                          aria-hidden="true"
                        />
                        {c.name}
                      </Link>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {results.items.map((item) => (
                    <Link
                      key={item.id}
                      href={`/menu/${item.slug}`}
                      className="bg-brand-card rounded-2xl border border-gray-700 overflow-hidden flex flex-col hover:border-brand-gold/60 hover:-translate-y-0.5 transition-all group"
                    >
                      <div className="relative h-40 overflow-hidden">
                        {item.image_url && (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                        )}
                        <div className="absolute top-3 right-3 bg-brand-dark/90 backdrop-blur-sm px-3 py-1.5 rounded-xl text-brand-gold font-extrabold text-sm border border-gray-700">
                          GH₵ {item.price.toFixed(2)}
                        </div>
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <h3 className="font-heading font-bold text-white leading-tight group-hover:text-brand-gold transition-colors">
                          {item.name}
                        </h3>
                        {item.category_name && (
                          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mt-1">
                            {item.category_name}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-2 line-clamp-2 flex-1">
                          {item.description}
                        </p>
                        {item.total_reviews > 0 && (
                          <div className="mt-3">
                            <StarRating
                              rating={item.average_rating}
                              size="sm"
                              showValue
                              count={item.total_reviews}
                            />
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Bottom CTA */}
                <div className="mt-10 text-center">
                  <Link
                    href="/menu"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-card border border-gray-700 text-gray-200 font-bold text-sm hover:border-brand-gold transition-colors group"
                  >
                    Browse the full menu
                    <ArrowRight
                      className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                      aria-hidden="true"
                    />
                  </Link>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
          <div className="w-full max-w-2xl space-y-3">
            <SkeletonLine className="h-10 w-full" />
            <SkeletonLine className="h-4 w-1/3" />
          </div>
        </div>
      }
    >
      <SearchInner />
    </Suspense>
  );
}