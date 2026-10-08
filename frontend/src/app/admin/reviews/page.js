"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";
import { SkeletonBlock, SkeletonLine } from "@/components/Skeleton";

/* ------------------------------------------------------------------ */
/*  constants                                                          */
/* ------------------------------------------------------------------ */

const TOKEN_KEY = "mrf_token";
const TOKEN_ISSUED_AT_KEY = "mrf_token_issued_at";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const FILTERS = [
  { key: "all", label: "All" },
  { key: "published", label: "Published" },
  { key: "hidden", label: "Hidden" },
  { key: "featured", label: "Featured" },
  { key: "low", label: "Low ratings" }, // 1-2 stars
];

/* ------------------------------------------------------------------ */
/*  helpers                                                            */
/* ------------------------------------------------------------------ */

function getAdminToken() {
  if (typeof window === "undefined") return null;
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    const issuedAt = Number(localStorage.getItem(TOKEN_ISSUED_AT_KEY) || 0);
    if (issuedAt && Date.now() - issuedAt > SESSION_MAX_AGE_MS) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_ISSUED_AT_KEY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

function clearAdminToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_ISSUED_AT_KEY);
  } catch {}
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function safeNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clampRating(v) {
  return Math.max(0, Math.min(5, Math.round(safeNumber(v))));
}

function relativeDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const min = 60_000;
  const hr = 3_600_000;
  const day = 86_400_000;
  if (diff < min) return "Just now";
  if (diff < hr) return `${Math.floor(diff / min)} min ago`;
  if (diff < day) return `${Math.floor(diff / hr)} h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)} d ago`;
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ------------------------------------------------------------------ */
/*  UI primitives                                                      */
/* ------------------------------------------------------------------ */

function Toast({ toast }) {
  if (!toast) return null;
  const styles =
    toast.type === "error"
      ? "bg-red-950/90 border-red-700 text-red-200"
      : "bg-emerald-950/90 border-emerald-700 text-emerald-200";
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-xl border text-sm font-semibold shadow-lg backdrop-blur ${styles}`}
    >
      {toast.message}
    </div>
  );
}

function Modal({ children, onClose, labelledBy, disableClose = false }) {
  const panelRef = useRef(null);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && !disableClose) onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, disableClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = panel.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    requestAnimationFrame(() => first?.focus?.());

    function onKey(e) {
      if (e.key !== "Tab" || focusables.length === 0) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus?.();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus?.();
      }
    }
    panel.addEventListener("keydown", onKey);
    return () => panel.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <div
        onClick={() => !disableClose && onClose?.()}
        className="absolute inset-0 bg-black/80"
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        className="relative bg-brand-card border border-gray-700 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        {children}
      </div>
    </div>
  );
}

function StarRating({ rating, size = "md" }) {
  const clamped = clampRating(rating);
  const sizeClass = size === "lg" ? "text-xl" : "text-base";
  return (
    <span
      className={`inline-flex items-center gap-0.5 ${sizeClass}`}
      role="img"
      aria-label={`${clamped} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          aria-hidden="true"
          className={n <= clamped ? "text-brand-gold" : "text-gray-700"}
        >
          ★
        </span>
      ))}
    </span>
  );
}

function ReviewsSkeleton({ count = 5 }) {
  return (
    <div role="status" aria-label="Loading reviews" className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-brand-card border border-gray-700 rounded-2xl p-5 space-y-3"
        >
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <SkeletonLine className="h-4 w-32" />
              <SkeletonLine className="h-3 w-40" />
            </div>
            <SkeletonBlock className="h-6 w-20 rounded" />
          </div>
          <SkeletonLine className="h-3 w-full" />
          <SkeletonLine className="h-3 w-5/6" />
          <div className="flex gap-2 pt-3 border-t border-gray-800">
            <SkeletonBlock className="h-8 flex-1 rounded-lg" />
            <SkeletonBlock className="h-8 flex-1 rounded-lg" />
            <SkeletonBlock className="h-8 w-10 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div className="bg-brand-card border border-gray-700 rounded-2xl p-5">
      <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">
        {label}
      </div>
      <div className={`text-3xl font-black mt-1 ${color}`}>{value}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminReviews() {
  const router = useRouter();

  const [token, setToken] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [showBreakdown, setShowBreakdown] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [lightbox, setLightbox] = useState(null); // { photos: [], index: n }

  const [busyIds, setBusyIds] = useState(() => new Set());
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);
  useEffect(
    () => () => toastTimer.current && clearTimeout(toastTimer.current),
    []
  );

  /* ---------- auth ---------- */
  useEffect(() => {
    const t = getAdminToken();
    if (!t) {
      router.replace("/admin");
      return;
    }
    setToken(t);
    setAuthChecked(true);
  }, [router]);

  useEffect(() => {
    function onStorage(e) {
      if (e.key === TOKEN_KEY && !e.newValue) router.replace("/admin");
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [router]);

  /* ---------- authed fetch ---------- */
  const authFetch = useCallback(
    async (url, init = {}) => {
      const headers = {
        ...(init.headers || {}),
        Authorization: `Bearer ${token}`,
      };
      const res = await fetch(url, { ...init, headers });
      if (res.status === 401) {
        clearAdminToken();
        router.replace("/admin");
        throw new Error("Session expired. Please sign in again.");
      }
      return res;
    },
    [token, router]
  );

  /* ---------- load ---------- */
  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [listRes, summaryRes] = await Promise.all([
        authFetch(`${API_URL}/api/v1/reviews?limit=200`),
        authFetch(`${API_URL}/api/v1/reviews/summary`),
      ]);
      if (!listRes.ok) throw new Error("Couldn't load reviews.");

      const list = await readJson(listRes);
      setReviews(Array.isArray(list) ? list : []);

      if (summaryRes.ok) {
        const s = await readJson(summaryRes);
        setSummary(s || null);
      } else {
        setSummary(null);
      }
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [token, authFetch]);

  useEffect(() => {
    if (!token) return;
    load();
  }, [token, reloadKey, load]);

  /* ---------- toggle publish / feature (optimistic) ---------- */
  const toggleField = useCallback(
    async (review, field) => {
      if (busyIds.has(review.id)) return;
      const prev = reviews;
      const next = !review[field];

      setReviews((list) =>
        list.map((r) => (r.id === review.id ? { ...r, [field]: next } : r))
      );
      setBusyIds((s) => new Set(s).add(review.id));

      try {
        const res = await authFetch(`${API_URL}/api/v1/reviews/${review.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: next }),
        });
        if (!res.ok) {
          const err = await readJson(res);
          throw new Error(err.detail || "Update failed.");
        }
        const updated = await readJson(res);
        if (updated?.id) {
          setReviews((list) =>
            list.map((r) => (r.id === updated.id ? updated : r))
          );
        }
        showToast(
          field === "is_published"
            ? next
              ? "Review published."
              : "Review hidden."
            : next
            ? "Marked as featured."
            : "Removed from featured."
        );
      } catch (err) {
        setReviews(prev);
        showToast(err.message || "Update failed.", "error");
      } finally {
        setBusyIds((s) => {
          const out = new Set(s);
          out.delete(review.id);
          return out;
        });
      }
    },
    [reviews, busyIds, authFetch, showToast]
  );

  /* ---------- delete ---------- */
  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const review = deleteTarget;
    setDeleting(true);
    setBusyIds((s) => new Set(s).add(review.id));
    try {
      const res = await authFetch(`${API_URL}/api/v1/reviews/${review.id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        const err = await readJson(res);
        throw new Error(err.detail || "Delete failed.");
      }
      setReviews((prev) => prev.filter((r) => r.id !== review.id));
      showToast("Review deleted.");
      setDeleteTarget(null);
    } catch (err) {
      showToast(err.message || "Delete failed.", "error");
    } finally {
      setDeleting(false);
      setBusyIds((s) => {
        const out = new Set(s);
        out.delete(review.id);
        return out;
      });
    }
  }, [deleteTarget, authFetch, showToast]);

  /* ---------- derived ---------- */
  const counts = useMemo(() => {
    const c = {
      all: reviews.length,
      published: 0,
      hidden: 0,
      featured: 0,
      low: 0,
    };
    for (const r of reviews) {
      if (r.is_published) c.published++;
      else c.hidden++;
      if (r.is_featured) c.featured++;
      if (clampRating(r.rating) <= 2) c.low++;
    }
    return c;
  }, [reviews]);

  const visibleReviews = useMemo(() => {
    let list = reviews;
    if (filter === "published") list = list.filter((r) => r.is_published);
    else if (filter === "hidden") list = list.filter((r) => !r.is_published);
    else if (filter === "featured") list = list.filter((r) => r.is_featured);
    else if (filter === "low")
      list = list.filter((r) => clampRating(r.rating) <= 2);

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.comment?.toLowerCase().includes(q) ||
          r.order_reference?.toLowerCase().includes(q) ||
          r.customer_name?.toLowerCase().includes(q)
      );
    }

    // Sort by created_at desc
    return [...list].sort((a, b) => {
      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bDate - aDate;
    });
  }, [reviews, filter, query]);

  const summaryData = useMemo(() => {
    return {
      average: safeNumber(summary?.average_rating),
      total: safeNumber(summary?.total_reviews),
      breakdown: summary?.rating_breakdown || {},
    };
  }, [summary]);

  const breakdownTotal = useMemo(() => {
    return [5, 4, 3, 2, 1].reduce(
      (s, n) => s + safeNumber(summaryData.breakdown[n]),
      0
    );
  }, [summaryData]);

  /* ---------- render guard ---------- */
  if (!authChecked || !token) {
    return (
      <div>
        <div className="h-8 w-48 rounded bg-gray-700/40 animate-pulse mb-6" />
        <ReviewsSkeleton count={5} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-white">
            Customer Reviews
          </h1>
          <p className="text-gray-400 text-sm mt-1 max-w-2xl">
            Moderate feedback submitted after deliveries.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <SummaryCard
          label="Average Rating"
          value={
            loading ? "—" : `${summaryData.average.toFixed(1)} ★`
          }
          color="text-brand-gold"
        />
        <SummaryCard
          label="Total Reviews"
          value={loading ? "—" : summaryData.total}
          color="text-white"
        />
        <SummaryCard
          label="5-Star Reviews"
          value={
            loading ? "—" : safeNumber(summaryData.breakdown["5"])
          }
          color="text-emerald-400"
        />
      </div>

      {/* Rating breakdown (collapsible) */}
      {!loading && summaryData.total > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowBreakdown((v) => !v)}
            aria-expanded={showBreakdown}
            className="text-xs text-brand-gold hover:underline font-bold flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-brand-gold/40 rounded px-1"
          >
            {showBreakdown ? "▼" : "▶"} Rating breakdown
          </button>
          {showBreakdown && (
            <div className="mt-3 bg-brand-card border border-gray-700 rounded-2xl p-5 space-y-2">
              {[5, 4, 3, 2, 1].map((n) => {
                const count = safeNumber(summaryData.breakdown[n]);
                const pct =
                  breakdownTotal > 0 ? (count / breakdownTotal) * 100 : 0;
                return (
                  <div key={n} className="flex items-center gap-3 text-xs">
                    <span className="text-gray-400 w-12">
                      {n} ★
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-gray-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-amber to-brand-gold transition-all motion-reduce:transition-none"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-white font-bold w-10 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Search + filters */}
      {!loading && reviews.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              🔍
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search comments, order ref…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-brand-card border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none transition-colors"
            />
          </div>
          <div
            role="tablist"
            aria-label="Filter reviews"
            className="flex gap-1 bg-brand-card border border-gray-700 rounded-xl p-1 overflow-x-auto no-scrollbar"
          >
            {FILTERS.map((f) => (
              <button
                key={f.key}
                role="tab"
                aria-selected={filter === f.key}
                onClick={() => setFilter(f.key)}
                disabled={counts[f.key] === 0 && f.key !== "all"}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/40 disabled:opacity-40 disabled:cursor-not-allowed ${
                  filter === f.key
                    ? "bg-brand-gold text-brand-dark"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {f.label}
                {counts[f.key] > 0 && (
                  <span
                    className={`ml-1 text-[10px] ${
                      filter === f.key
                        ? "text-brand-dark/70"
                        : "text-gray-500"
                    }`}
                  >
                    ({counts[f.key]})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-3"
        >
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="text-xs font-bold underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <ReviewsSkeleton count={5} />
      ) : reviews.length === 0 ? (
        <div className="bg-brand-card border border-gray-700 rounded-2xl p-12 text-center">
          <div className="text-5xl mb-3" aria-hidden="true">
            ⭐
          </div>
          <h2 className="font-bold text-white text-lg">No reviews yet</h2>
          <p className="text-gray-400 text-sm mt-1 max-w-sm mx-auto">
            Reviews appear here once customers submit feedback after their
            deliveries.
          </p>
        </div>
      ) : visibleReviews.length === 0 ? (
        <div className="bg-brand-card border border-gray-700 rounded-2xl p-10 text-center">
          <p className="text-gray-400 text-sm">No reviews match your filters.</p>
          <button
            onClick={() => {
              setQuery("");
              setFilter("all");
            }}
            className="mt-3 text-brand-gold text-xs font-bold underline hover:no-underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleReviews.map((review) => {
            const busy = busyIds.has(review.id);
            const rating = clampRating(review.rating);
            const photos = Array.isArray(review.photo_urls)
              ? review.photo_urls
              : [];

            return (
              <article
                key={review.id}
                aria-busy={busy}
                className={`bg-brand-card border border-gray-700 rounded-2xl p-5 transition-all hover:border-gray-600 ${
                  busy ? "opacity-60" : ""
                }`}
              >
                <div className="flex justify-between items-start mb-3 gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StarRating rating={rating} size="lg" />
                      <span className="text-[11px] text-gray-400 font-bold">
                        {rating}/5
                      </span>
                      <span className="font-mono text-xs text-gray-500">
                        {review.order_reference}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">
                      {review.customer_name && (
                        <>
                          <span className="text-gray-400">
                            {review.customer_name}
                          </span>{" "}
                          ·{" "}
                        </>
                      )}
                      <time dateTime={review.created_at}>
                        {relativeDate(review.created_at)}
                      </time>{" "}
                      ·{" "}
                      <span title={formatDateTime(review.created_at)}>
                        {formatDateTime(review.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end shrink-0">
                    {!review.is_published && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">
                        HIDDEN
                      </span>
                    )}
                    {review.is_featured && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-brand-gold/20 text-brand-gold font-bold">
                        FEATURED
                      </span>
                    )}
                  </div>
                </div>

                {review.comment && (
                  <p className="text-sm text-gray-200 mb-3 whitespace-pre-wrap break-words">
                    {review.comment}
                  </p>
                )}

                {photos.length > 0 && (
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {photos.map((u, i) => (
                      <button
                        key={i}
                        onClick={() => setLightbox({ photos, index: i })}
                        aria-label={`View photo ${i + 1} of ${photos.length}`}
                        className="rounded-lg overflow-hidden border border-gray-700 hover:border-brand-gold/60 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/40"
                      >
                        <img
                          src={u}
                          alt=""
                          loading="lazy"
                          className="w-20 h-20 object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-800">
                  <button
                    onClick={() => toggleField(review, "is_published")}
                    disabled={busy}
                    className={`flex-1 min-w-[100px] py-2 rounded-lg text-xs font-bold transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 ${
                      review.is_published
                        ? "bg-red-600/20 hover:bg-red-600/30 text-red-400 focus:ring-red-500/40"
                        : "bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 focus:ring-emerald-500/40"
                    }`}
                  >
                    {busy ? "…" : review.is_published ? "Hide" : "Publish"}
                  </button>
                  <button
                    onClick={() => toggleField(review, "is_featured")}
                    disabled={busy}
                    className={`flex-1 min-w-[100px] py-2 rounded-lg text-xs font-bold transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 ${
                      review.is_featured
                        ? "bg-gray-700 hover:bg-gray-600 text-gray-300 focus:ring-gray-600"
                        : "bg-brand-gold/20 hover:bg-brand-gold/30 text-brand-gold focus:ring-brand-gold/40"
                    }`}
                  >
                    {busy
                      ? "…"
                      : review.is_featured
                      ? "Unfeature"
                      : "Feature"}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(review)}
                    disabled={busy}
                    aria-label={`Delete review ${review.order_reference}`}
                    className="px-3 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 disabled:opacity-50 text-red-400 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40"
                  >
                    🗑
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ---------- Delete confirm ---------- */}
      {deleteTarget && (
        <Modal
          onClose={() => (deleting ? null : setDeleteTarget(null))}
          labelledBy="delete-review-title"
          disableClose={deleting}
        >
          <div className="p-6 space-y-4">
            <h3
              id="delete-review-title"
              className="font-heading text-lg font-bold text-white"
            >
              Delete this review?
            </h3>
            <div className="p-3 rounded-xl bg-brand-dark border border-gray-700 text-sm">
              <StarRating rating={clampRating(deleteTarget.rating)} />
              <p className="text-gray-300 mt-2 line-clamp-3">
                {deleteTarget.comment || "(No comment)"}
              </p>
            </div>
            <p className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
              This is permanent. Featured reviews will be removed from the
              homepage too.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white font-bold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-brand-crimson hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ---------- Photo lightbox ---------- */}
      {lightbox && (
        <Lightbox
          photos={lightbox.photos}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onIndexChange={(i) =>
            setLightbox({ photos: lightbox.photos, index: i })
          }
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Lightbox                                                           */
/* ------------------------------------------------------------------ */

function Lightbox({ photos, index, onClose, onIndexChange }) {
  const total = photos.length;
  const current = photos[index] || "";

  const goPrev = useCallback(() => {
    onIndexChange((index - 1 + total) % total);
  }, [index, total, onIndexChange]);

  const goNext = useCallback(() => {
    onIndexChange((index + 1) % total);
  }, [index, total, onIndexChange]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, goPrev, goNext]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95"
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl focus:outline-none focus:ring-2 focus:ring-white/40"
      >
        ✕
      </button>

      {total > 1 && (
        <>
          <button
            onClick={goPrev}
            aria-label="Previous photo"
            className="absolute left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            ‹
          </button>
          <button
            onClick={goNext}
            aria-label="Next photo"
            className="absolute right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            ›
          </button>
        </>
      )}

      <img
        src={current}
        alt=""
        className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
      />

      {total > 1 && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 px-3 py-1.5 rounded-full"
          aria-live="polite"
        >
          {index + 1} / {total}
        </div>
      )}
    </div>
  );
}