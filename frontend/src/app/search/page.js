"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { API_URL } from "@/lib/api";
import StarRating from "@/components/StarRating";
import { MenuGridSkeleton, SkeletonLine } from "@/components/Skeleton";

function SearchInner() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";

  const [input, setInput] = useState(q);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

      const url = `${API_URL}/api/v1/search?q=${encodeURIComponent(q)}&limit=50`;
      console.log("[search page] fetching:", url);

      try {
        const res = await fetch(url, { cache: "no-store" });
        console.log("[search page] status:", res.status);

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
        }

        const data = await res.json();
        console.log("[search page] data:", data);

        if (!cancelled) setResults(data);
      } catch (e) {
        console.error("[search page] error:", e);
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
  }, [q]);

  function submit(e) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    window.location.href = `/search?q=${encodeURIComponent(trimmed)}`;
  }

  return (
    <div className="min-h-screen bg-brand-dark text-gray-100">
      <header className="sticky top-0 z-40 bg-brand-dark/95 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-bold text-gray-300 hover:text-brand-gold whitespace-nowrap"
          >
            ← Home
          </Link>
          <form onSubmit={submit} className="flex-1 flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search fries, wings, gizzard…"
              className="flex-1 px-4 py-2.5 rounded-xl bg-brand-card border border-gray-700 text-white text-sm outline-none focus:border-brand-gold"
              autoFocus
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-brand-gold text-brand-dark text-xs font-extrabold"
            >
              Search
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {!q ? (
          <div className="text-center py-20">
            <div className="text-5xl">🔍</div>
            <p className="text-gray-400 mt-4">
              Type something above to search our menu.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <div className="text-xs uppercase tracking-widest text-gray-500 font-bold">
                Search results for
              </div>
              <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-white mt-1">
                "{q}"
              </h1>
              {results && !loading && (
                <p className="text-gray-400 text-sm mt-1">
                  {results.total} item{results.total === 1 ? "" : "s"} found
                </p>
              )}
            </div>

            {loading && <MenuGridSkeleton count={6} />}

            {!loading && error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
                <div className="text-red-400 font-bold mb-2">
                  Search failed
                </div>
                <div className="text-red-300 text-sm font-mono break-all">
                  {error}
                </div>
                <div className="text-gray-400 text-xs mt-3">
                  Make sure the backend is running at{" "}
                  <code className="text-brand-gold">{API_URL}</code> and that
                  you've restarted uvicorn since editing the search code.
                </div>
              </div>
            )}

            {!loading && !error && results && results.items.length === 0 && (
              <div className="text-center py-20">
                <div className="text-5xl">🍟</div>
                <p className="text-gray-300 mt-4 font-bold">
                  No items found for "{q}"
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Try a different word, or{" "}
                  <Link href="/#menu" className="text-brand-gold underline">
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
                        href={`/?category=${c.slug}`}
                        className="px-3 py-1.5 rounded-lg bg-brand-card border border-gray-700 text-xs font-bold text-gray-200 hover:border-brand-gold"
                      >
                        📂 {c.name}
                      </Link>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {results.items.map((item) => (
                    <Link
                      key={item.id}
                      href={`/menu/${item.slug}`}
                      className="bg-brand-card rounded-2xl border border-gray-700 overflow-hidden flex flex-col hover:border-brand-gold/60 transition-colors"
                    >
                      <div className="relative h-40 overflow-hidden">
                        {item.image_url && (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                        <div className="absolute top-3 right-3 bg-brand-dark/90 px-3 py-1 rounded-xl text-brand-gold font-extrabold text-sm border border-gray-700">
                          GH₵ {item.price.toFixed(2)}
                        </div>
                      </div>
                      <div className="p-4 flex-1">
                        <h3 className="font-heading font-bold text-white leading-tight">
                          {item.name}
                        </h3>
                        {item.category_name && (
                          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mt-1">
                            {item.category_name}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                          {item.description}
                        </p>
                        {item.total_reviews > 0 && (
                          <div className="mt-2">
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

"use client";

// ... existing imports ...

// At the top of the component, add this useEffect to inject noindex
export default function SearchPage() {
  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "robots";
      document.head.appendChild(meta);
    }
    meta.content = "noindex, follow";
    return () => {
      if (meta) meta.content = "";
    };
  }, []);

  return (
    <Suspense fallback={/* ... existing ... */}>
      <SearchInner />
    </Suspense>
  );
}