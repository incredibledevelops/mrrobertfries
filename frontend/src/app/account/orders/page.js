"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";
import {
  getCustomerToken,
  clearCustomerTokens,
  customerFetch,
} from "@/lib/customerAuth";
import { AccountHeader } from "../page";
import { SkeletonBlock, SkeletonLine } from "@/components/Skeleton";

/* ------------------------------------------------------------------ */
/*  status metadata                                                    */
/* ------------------------------------------------------------------ */

const STATUS_META = {
  pending: {
    label: "Pending",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/30",
    emoji: "⏳",
  },
  paid: {
    label: "Paid",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/30",
    emoji: "✅",
  },
  preparing: {
    label: "Preparing",
    color: "text-brand-amber",
    bg: "bg-amber-500/10 border-amber-500/30",
    emoji: "👨‍🍳",
  },
  ready: {
    label: "Ready",
    color: "text-brand-gold",
    bg: "bg-brand-gold/10 border-brand-gold/30",
    emoji: "🍟",
  },
  out_for_delivery: {
    label: "On the Way",
    color: "text-brand-gold",
    bg: "bg-brand-gold/10 border-brand-gold/30",
    emoji: "🛵",
  },
  delivered: {
    label: "Delivered",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/30",
    emoji: "🎉",
  },
  cancelled: {
    label: "Cancelled",
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/30",
    emoji: "❌",
  },
  failed: {
    label: "Failed",
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/30",
    emoji: "❌",
  },
  refunded: {
    label: "Refunded",
    color: "text-sky-400",
    bg: "bg-sky-500/10 border-sky-500/30",
    emoji: "↩️",
  },
};

const ACTIVE_STATUSES = new Set([
  "pending",
  "paid",
  "preparing",
  "ready",
  "out_for_delivery",
]);

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

/* ------------------------------------------------------------------ */
/*  helpers                                                            */
/* ------------------------------------------------------------------ */

function formatGHS(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "GH₵ 0.00";
  return `GH₵ ${n.toFixed(2)}`;
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function formatDateTime(iso) {
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
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ------------------------------------------------------------------ */
/*  small UI bits                                                      */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || {
    label: status || "Unknown",
    color: "text-gray-300",
    bg: "bg-gray-800 border-gray-700",
    emoji: "•",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-bold ${meta.color} ${meta.bg}`}
    >
      <span aria-hidden="true">{meta.emoji}</span>
      {meta.label}
    </span>
  );
}

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

function OrdersListSkeleton({ count = 4 }) {
  return (
    <div
      role="status"
      aria-label="Loading orders"
      className="space-y-3"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-brand-card border border-gray-700 rounded-2xl p-5 space-y-3"
        >
          <div className="flex justify-between">
            <div className="space-y-2">
              <SkeletonLine className="h-4 w-32" />
              <SkeletonLine className="h-3 w-24" />
            </div>
            <SkeletonBlock className="h-6 w-24 rounded-full" />
          </div>
          <div className="space-y-1.5 pt-3 border-t border-gray-800">
            <SkeletonLine className="h-3 w-full" />
            <SkeletonLine className="h-3 w-5/6" />
          </div>
          <div className="flex justify-between pt-3 border-t border-gray-800">
            <SkeletonLine className="h-3 w-32" />
            <SkeletonLine className="h-3 w-20" />
          </div>
          <div className="flex gap-2">
            <SkeletonBlock className="h-8 flex-1 rounded-lg" />
            <SkeletonBlock className="h-8 flex-1 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  page                                                               */
/* ------------------------------------------------------------------ */

export default function MyOrdersPage() {
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [filter, setFilter] = useState("all");
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

  /* ---------- load ---------- */
  const load = useCallback(
    async (signal) => {
      try {
        const [meRes, ordersRes] = await Promise.all([
          customerFetch(`${API_URL}/api/v1/customer-account/me`),
          customerFetch(`${API_URL}/api/v1/customer-account/orders?limit=50`),
        ]);

        if (meRes.status === 401 || ordersRes.status === 401) {
          clearCustomerTokens();
          router.replace("/account");
          return;
        }
        if (!meRes.ok || !ordersRes.ok) {
          throw new Error("Couldn't load your orders.");
        }

        const [me, os] = await Promise.all([
          readJson(meRes),
          readJson(ordersRes),
        ]);
        if (signal?.aborted) return;
        setProfile(me);
        setOrders(Array.isArray(os) ? os : []);
        setError("");
      } catch (e) {
        if (signal?.aborted) return;
        setError(e.message || "Something went wrong.");
      }
    },
    [router]
  );

  useEffect(() => {
    if (!getCustomerToken()) {
      router.replace("/account");
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    (async () => {
      await load(controller.signal);
      if (!controller.signal.aborted) setLoading(false);
    })();
    return () => controller.abort();
  }, [load, reloadKey, router]);

  /* ---------- auto-refresh while any order is active ---------- */
  const hasActiveOrder = useMemo(
    () => orders.some((o) => ACTIVE_STATUSES.has(o.status)),
    [orders]
  );

  useEffect(() => {
    if (!hasActiveOrder) return;
    let cancelled = false;
    const t = setInterval(async () => {
      if (cancelled) return;
      const controller = new AbortController();
      await load(controller.signal);
    }, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [hasActiveOrder, load]);

  /* ---------- cross-tab logout ---------- */
  useEffect(() => {
    function onStorage(e) {
      if (
        e.key === "mrf_customer_token" ||
        e.key === "mrf_customer_refresh" ||
        e.key === "mrf_customer_tokens"
      ) {
        if (!getCustomerToken()) router.replace("/account");
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [router]);

  const logout = useCallback(() => {
    clearCustomerTokens();
    router.push("/account");
  }, [router]);

  /* ---------- copy reference ---------- */
  const copyRef = useCallback(
    async (reference) => {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(reference);
        } else {
          const ta = document.createElement("textarea");
          ta.value = reference;
          ta.setAttribute("readonly", "");
          ta.style.position = "absolute";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        }
        showToast("Order reference copied.");
      } catch {
        showToast("Couldn't copy — long-press to select.", "error");
      }
    },
    [showToast]
  );

  /* ---------- derived ---------- */
  const counts = useMemo(() => {
    const c = { all: orders.length, active: 0, delivered: 0, cancelled: 0 };
    for (const o of orders) {
      if (ACTIVE_STATUSES.has(o.status)) c.active++;
      else if (o.status === "delivered") c.delivered++;
      else if (
        o.status === "cancelled" ||
        o.status === "failed" ||
        o.status === "refunded"
      )
        c.cancelled++;
    }
    return c;
  }, [orders]);

  const visibleOrders = useMemo(() => {
    if (filter === "all") return orders;
    if (filter === "active")
      return orders.filter((o) => ACTIVE_STATUSES.has(o.status));
    if (filter === "delivered")
      return orders.filter((o) => o.status === "delivered");
    if (filter === "cancelled")
      return orders.filter((o) =>
        ["cancelled", "failed", "refunded"].includes(o.status)
      );
    return orders;
  }, [orders, filter]);

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */

  return (
    <div className="min-h-screen bg-brand-dark text-gray-100">
      <AccountHeader
        profile={profile}
        onLogout={logout}
        activeTab="/account/orders"
      />

      <main className="max-w-4xl mx-auto p-6 space-y-5">
        {/* Header */}
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-extrabold text-white">
              My Orders
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              {loading
                ? "Loading…"
                : orders.length === 0
                ? "No orders yet"
                : `${orders.length} order${
                    orders.length === 1 ? "" : "s"
                  } · updated ${hasActiveOrder ? "live" : "just now"}`}
            </p>
          </div>
          {hasActiveOrder && (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-brand-gold/30 bg-brand-gold/10 text-brand-gold text-[11px] font-bold"
              title="We'll keep this list fresh automatically"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse" />
              Live
            </span>
          )}
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-3"
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

        {/* Filters */}
        {!loading && orders.length > 0 && (
          <div
            role="tablist"
            aria-label="Filter orders"
            className="flex gap-2 overflow-x-auto no-scrollbar pb-1"
          >
            {FILTERS.map((f) => {
              const active = filter === f.key;
              const count = counts[f.key] ?? 0;
              return (
                <button
                  key={f.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(f.key)}
                  disabled={count === 0 && f.key !== "all"}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/40 disabled:opacity-40 disabled:cursor-not-allowed ${
                    active
                      ? "bg-brand-gold text-brand-dark"
                      : "bg-brand-card border border-gray-700 text-gray-300 hover:text-white"
                  }`}
                >
                  {f.label}
                  {count > 0 && (
                    <span
                      className={`ml-1.5 text-[10px] ${
                        active ? "text-brand-dark/70" : "text-gray-500"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <OrdersListSkeleton count={4} />
        ) : orders.length === 0 ? (
          <div className="bg-brand-card border border-gray-700 rounded-2xl p-12 text-center">
            <div className="text-5xl mb-3" aria-hidden="true">
              📭
            </div>
            <h2 className="font-bold text-white text-lg">No orders yet</h2>
            <p className="text-gray-400 text-sm mt-1 max-w-sm mx-auto">
              Once you place an order, you'll see it here with live tracking.
            </p>
            <Link
              href="/#menu"
              className="inline-block mt-5 px-5 py-2.5 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-bold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/60"
            >
              Start Ordering
            </Link>
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="bg-brand-card border border-gray-700 rounded-2xl p-10 text-center">
            <p className="text-gray-400 text-sm">
              No {filter} orders to show.
            </p>
            <button
              onClick={() => setFilter("all")}
              className="mt-3 text-brand-gold text-xs font-bold underline hover:no-underline"
            >
              Show all orders
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleOrders.map((o) => {
              const isActive = ACTIVE_STATUSES.has(o.status);
              const isCancelled = ["cancelled", "failed", "refunded"].includes(
                o.status
              );
              const items = Array.isArray(o.items) ? o.items : [];
              const shownItems = items.slice(0, 3);
              const extraCount = items.length - shownItems.length;

              return (
                <article
                  key={o.id}
                  aria-label={`Order ${o.reference}`}
                  className="bg-brand-card border border-gray-700 rounded-2xl p-5 hover:border-gray-600 transition-colors"
                >
                  {/* Header row */}
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <div className="min-w-0">
                      <button
                        onClick={() => copyRef(o.reference)}
                        title="Copy reference"
                        className="font-mono text-xs text-brand-gold font-bold hover:underline focus:outline-none focus:ring-2 focus:ring-brand-gold/40 rounded px-1 -mx-1"
                      >
                        {o.reference}
                      </button>
                      <div className="text-[10px] text-gray-500 mt-1">
                        <time dateTime={o.created_at}>
                          {formatDateTime(o.created_at)}
                        </time>
                      </div>
                    </div>
                    <StatusBadge status={o.status} />
                  </div>

                  {/* Items summary */}
                  {items.length > 0 && (
                    <div className="space-y-1 text-xs text-gray-300 border-t border-gray-800 pt-3">
                      {shownItems.map((it, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between gap-3"
                        >
                          <span className="truncate">
                            <span className="text-brand-gold font-bold">
                              {it.quantity}×
                            </span>{" "}
                            {it.name}
                          </span>
                          <span className="shrink-0">
                            {formatGHS(
                              safeNumber(it.unit_price) * safeNumber(it.quantity)
                            )}
                          </span>
                        </div>
                      ))}
                      {extraCount > 0 && (
                        <div className="text-[11px] text-gray-500 italic">
                          + {extraCount} more item
                          {extraCount === 1 ? "" : "s"}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer row */}
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-800 gap-3">
                    <span className="text-xs text-gray-400 truncate">
                      📍 {o.delivery_zone_name || "—"}
                    </span>
                    <span className="text-brand-gold font-bold shrink-0">
                      {formatGHS(o.total)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex gap-2">
                    {isActive ? (
                      <Link
                        href={`/order/${o.reference}`}
                        className="flex-1 py-2 rounded-lg bg-brand-gold hover:bg-brand-amber text-brand-dark text-xs font-extrabold text-center transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/60"
                      >
                        🛵 Track Order
                      </Link>
                    ) : (
                      <Link
                        href={`/order/${o.reference}`}
                        className="flex-1 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold text-center transition-colors focus:outline-none focus:ring-2 focus:ring-gray-600"
                      >
                        View Details
                      </Link>
                    )}

                    {!isCancelled && (
                      <Link
                        href={`/#menu`}
                        className="flex-1 py-2 rounded-lg bg-brand-gold/20 hover:bg-brand-gold/30 text-brand-gold text-xs font-bold text-center transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/40"
                      >
                        Order Again
                      </Link>
                    )}

                    {isCancelled && (
                      <Link
                        href={`/#menu`}
                        className="flex-1 py-2 rounded-lg bg-brand-gold/20 hover:bg-brand-gold/30 text-brand-gold text-xs font-bold text-center transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/40"
                      >
                        Try Again
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <Toast toast={toast} />
    </div>
  );
}