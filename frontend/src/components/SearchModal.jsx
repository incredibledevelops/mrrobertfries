"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Clock,
  FolderOpen,
  Utensils,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
  SearchX,
} from "lucide-react";
import { API_URL } from "@/lib/api";

const RECENT_KEY = "mrf_recent_searches";
const BRANCH_KEY = "mrf_branch_id";
const MAX_RECENT = 5;
const DEBOUNCE_MS = 220;

function loadRecent() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadBranchId() {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(BRANCH_KEY) || "";
  } catch {
    return "";
  }
}

function saveRecent(term) {
  if (!term) return;
  const trimmed = term.trim();
  if (!trimmed) return;
  const current = loadRecent();
  const next = [trimmed, ...current.filter((t) => t !== trimmed)].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
}

function formatGHS(n) {
  const v = Number.isFinite(n) ? n : 0;
  return `GH₵ ${v.toFixed(2)}`;
}

export default function SearchModal({ open, onOpenChange }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const dialogRef = useRef(null);
  const previouslyFocusedRef = useRef(null);
  const listRef = useRef(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState("");

  // Branch id resolved from localStorage; refreshed on open.
  const branchIdRef = useRef("");
  useEffect(() => {
    if (open) branchIdRef.current = loadBranchId();
  }, [open]);

  useEffect(() => {
    if (open) {
      previouslyFocusedRef.current = document.activeElement;
      setRecent(loadRecent());
      branchIdRef.current = loadBranchId();
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery("");
      setResults(null);
      setActiveIndex(0);
      setError("");
      const prev = previouslyFocusedRef.current;
      if (prev && typeof prev.focus === "function") prev.focus();
      previouslyFocusedRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    const originalTouch = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = original;
      document.body.style.touchAction = originalTouch;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(null);
      setError("");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError("");

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: trimmed, limit: "8" });
        if (branchIdRef.current) params.set("branch_id", branchIdRef.current);
        const res = await fetch(
          `${API_URL}/api/v1/search?${params.toString()}`,
          { cache: "no-store", signal: controller.signal }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setResults(data);
        setActiveIndex(0);
      } catch (e) {
        if (e.name === "AbortError") return;
        setError(e.message || "Search failed");
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, open]);

  const navigableItems = useMemo(() => {
    const list = [];
    if (results) {
      for (const item of results.items || []) {
        list.push({
          key: `item-${item.id ?? item.slug ?? item.name}`,
          type: "item",
          label: item.name,
          sublabel:
            (item.category_name ? `${item.category_name} · ` : "") +
            (item.price != null ? formatGHS(item.price) : ""),
          image: item.image_url,
          href: `/menu/${item.slug}`,
        });
      }
      for (const cat of results.categories || []) {
        list.push({
          key: `cat-${cat.id ?? cat.slug ?? cat.name}`,
          type: "category",
          label: cat.name,
          sublabel: "Category",
          href: `/search?q=${encodeURIComponent(cat.name)}`,
        });
      }
    } else if (recent.length > 0) {
      for (const term of recent) {
        list.push({
          key: `recent-${term}`,
          type: "recent",
          label: term,
          sublabel: "Recent search",
          href: `/search?q=${encodeURIComponent(term)}`,
        });
      }
    }
    return list;
  }, [results, recent]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-row-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const navigate = useCallback(
    (href) => {
      const trimmed = query.trim();
      if (trimmed) saveRecent(trimmed);
      close();
      router.push(href);
    },
    [query, close, router]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) =>
          navigableItems.length ? Math.min(i + 1, navigableItems.length - 1) : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Home") {
        e.preventDefault();
        setActiveIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setActiveIndex(Math.max(navigableItems.length - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const target = navigableItems[activeIndex];
        if (target) navigate(target.href);
        else if (query.trim())
          navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      } else if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [navigableItems, activeIndex, navigate, close, query]
  );

  const clearRecent = useCallback(() => {
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {}
    setRecent([]);
    setActiveIndex(0);
  }, []);

  if (!open) return null;

  const trimmed = query.trim();
  const showRecents = !trimmed && recent.length > 0;
  const showEmptyPrompt = !trimmed && recent.length === 0;
  const showResults = !!trimmed && !!results && navigableItems.length > 0;
  const showNoResults =
    !!trimmed && !!results && navigableItems.length === 0 && !loading && !error;

  return (
    <div
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="search-modal-title"
      onKeyDown={handleKeyDown}
      ref={dialogRef}
    >
      <h2 id="search-modal-title" className="sr-only">
        Search menu
      </h2>

      <div
        onClick={close}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]"
      />

      <div className="relative max-w-2xl mx-auto mt-4 sm:mt-24 px-4 animate-[slideDown_200ms_ease-out]">
        <style jsx>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        <div className="bg-brand-card border border-gray-700 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
          {/* Input */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800">
            <Search className="w-5 h-5 text-brand-gold shrink-0" aria-hidden="true" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search fries, wings, gizzard…"
              className="flex-1 bg-transparent text-white placeholder:text-gray-500 outline-none text-base"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-autocomplete="list"
              aria-controls="search-results"
              aria-activedescendant={
                navigableItems[activeIndex]
                  ? `search-row-${activeIndex}`
                  : undefined
              }
              aria-busy={loading}
            />
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="p-1 rounded-md text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] text-gray-500 border border-gray-700 px-2 py-1 rounded font-mono">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div
            id="search-results"
            role="listbox"
            ref={listRef}
            className="max-h-[60vh] overflow-y-auto overscroll-contain"
          >
            {loading && (
              <div className="px-5 py-4 text-xs text-gray-500 flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full border-2 border-brand-gold/40 border-t-brand-gold animate-spin" />
                Searching…
              </div>
            )}

            {error && !loading && (
              <div className="px-5 py-4 text-xs text-red-400">
                Search failed: <span className="font-mono">{error}</span>
              </div>
            )}

            {showEmptyPrompt && (
              <div className="px-5 py-12 text-center">
                <Search className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm font-medium">
                  Start typing to search our menu
                </p>
                <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                  <span className="text-[10px] text-gray-600 uppercase tracking-wider font-bold">
                    Try:
                  </span>
                  {["wings", "gizzard", "yam"].map((term) => (
                    <button
                      key={term}
                      onClick={() => setQuery(term)}
                      className="px-2 py-1 rounded-md bg-gray-800 text-brand-gold text-xs font-mono hover:bg-gray-700 transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showRecents && (
              <div>
                <div className="flex items-center justify-between px-5 pt-4 pb-2">
                  <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                    <Clock className="w-3 h-3" />
                    Recent
                  </span>
                  <button
                    onClick={clearRecent}
                    className="text-[10px] text-red-400 hover:underline"
                  >
                    Clear
                  </button>
                </div>
                {recent.map((term, idx) => (
                  <RowButton
                    key={`r-${term}`}
                    id={`search-row-${idx}`}
                    data-row-index={idx}
                    active={idx === activeIndex}
                    onClick={() =>
                      navigate(`/search?q=${encodeURIComponent(term)}`)
                    }
                    onMouseEnter={() => setActiveIndex(idx)}
                  >
                    <Clock className="w-4 h-4 text-gray-500 mr-3 shrink-0" />
                    <span className="flex-1 text-white text-sm">{term}</span>
                  </RowButton>
                ))}
              </div>
            )}

            {showResults && (
              <>
                {results.items?.length > 0 && (
                  <div>
                    <div className="px-5 pt-4 pb-2 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                      <Utensils className="w-3 h-3" />
                      Items ({results.items.length})
                    </div>
                    {navigableItems
                      .map((n, idx) => ({ n, idx }))
                      .filter(({ n }) => n.type === "item")
                      .map(({ n, idx }) => (
                        <RowButton
                          key={n.key}
                          id={`search-row-${idx}`}
                          data-row-index={idx}
                          active={idx === activeIndex}
                          onClick={() => navigate(n.href)}
                          onMouseEnter={() => setActiveIndex(idx)}
                        >
                          {n.image ? (
                            <img
                              src={n.image}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover mr-3 shrink-0"
                              loading="lazy"
                            />
                          ) : (
                            <span className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center mr-3 shrink-0">
                              <Utensils className="w-4 h-4 text-gray-500" />
                            </span>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-white text-sm font-semibold truncate">
                              {n.label}
                            </div>
                            {n.sublabel && (
                              <div className="text-[11px] text-gray-500 truncate">
                                {n.sublabel}
                              </div>
                            )}
                          </div>
                        </RowButton>
                      ))}
                  </div>
                )}

                {results.categories?.length > 0 && (
                  <div>
                    <div className="px-5 pt-4 pb-2 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                      <FolderOpen className="w-3 h-3" />
                      Categories
                    </div>
                    {navigableItems
                      .map((n, idx) => ({ n, idx }))
                      .filter(({ n }) => n.type === "category")
                      .map(({ n, idx }) => (
                        <RowButton
                          key={n.key}
                          id={`search-row-${idx}`}
                          data-row-index={idx}
                          active={idx === activeIndex}
                          onClick={() => navigate(n.href)}
                          onMouseEnter={() => setActiveIndex(idx)}
                        >
                          <FolderOpen className="w-4 h-4 text-brand-gold mr-3 shrink-0" />
                          <span className="flex-1 text-white text-sm">
                            {n.label}
                          </span>
                        </RowButton>
                      ))}
                  </div>
                )}
              </>
            )}

            {showNoResults && (
              <div className="px-5 py-12 text-center">
                <SearchX className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-300 text-sm font-medium">
                  No results for{" "}
                  <span className="text-white">"{query}"</span>
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  Try a different word or{" "}
                  <button
                    onClick={() => navigate("/menu")}
                    className="text-brand-gold underline"
                  >
                    browse the full menu
                  </button>
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-800 bg-gray-900/50 text-[10px] text-gray-500">
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-1.5">
                <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 border border-gray-700 rounded">
                  <ArrowUp className="w-2.5 h-2.5" />
                  <ArrowDown className="w-2.5 h-2.5" />
                </kbd>
                navigate
              </span>
              <span className="inline-flex items-center gap-1.5">
                <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 border border-gray-700 rounded">
                  <CornerDownLeft className="w-2.5 h-2.5" />
                </kbd>
                select
              </span>
            </div>
            {trimmed && (
              <button
                onClick={() =>
                  navigate(`/search?q=${encodeURIComponent(trimmed)}`)
                }
                className="text-brand-gold hover:underline font-bold"
              >
                See all results →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RowButton({ active, children, ...props }) {
  return (
    <button
      {...props}
      role="option"
      aria-selected={active}
      className={`w-full flex items-center px-5 py-3 text-left transition-colors focus:outline-none ${
        active ? "bg-brand-gold/10" : "hover:bg-gray-800/40"
      }`}
    >
      {children}
    </button>
  );
}