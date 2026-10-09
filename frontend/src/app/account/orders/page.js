"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  CheckCircle2,
  ChefHat,
  Utensils,
  Bike,
  PartyPopper,
  XCircle,
  Package,
  MapPin,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  ShoppingBag,
  Receipt,
  History,
  ArrowRight,
} from "lucide-react";
import { API_URL } from "@/lib/api";
import {
  getCustomerToken,
  clearCustomerTokens,
  customerFetch,
} from "@/lib/customerAuth";
import { AccountHeader } from "../page";
import { SkeletonBlock, SkeletonLine } from "@/components/Skeleton";

const STATUS_META = {
  pending: { label: "Pending", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30", Icon: Clock },
  paid: { label: "Paid", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", Icon: CheckCircle2 },
  preparing: { label: "Preparing", color: "text-brand-amber", bg: "bg-amber-500/10 border-amber-500/30", Icon: ChefHat },
  ready: { label: "Ready", color: "text-brand-gold", bg: "bg-brand-gold/10 border-brand-gold/30", Icon: Utensils },
  out_for_delivery: { label: "On the Way", color: "text-brand-gold", bg: "bg-brand-gold/10 border-brand-gold/30", Icon: Bike },
  delivered: { label: "Delivered", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", Icon: PartyPopper },
  cancelled: { label: "Cancelled", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", Icon: XCircle },
  failed: { label: "Failed", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", Icon: XCircle },
  refunded: { label: "Refunded", color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/30", Icon: RefreshCw },
};

const ACTIVE_STATUSES = new Set([
  "pending", "paid", "preparing", "ready", "out_for_delivery",
]);

const FILTERS = [
  { key: "all", label: "All", Icon: Receipt },
  { key: "active", label: "Active", Icon: Bike },
  { key: "delivered", label: "Delivered", Icon: PartyPopper },
  { key: "cancelled", label: "Cancelled", Icon: XCircle },
];

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
  if (diff < day) return `${Math.floor(diff / hr)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status || "Unknown", color: "text-gray-300", bg: "bg-gray-800 border-gray-700", Icon: Package };
  const Icon = meta.Icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-bold ${meta.color} ${meta.bg}`}>
      <Icon className="w-3 h-3" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  const styles = toast.type === "error"
    ? "bg-red-950/90 border-red-700 text-red-200"
    : "bg-emerald-950/90 border-emerald-700 text-emerald-200";
  return (
    <div role="status" aria-live="polite" className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-xl border text-sm font-semibold shadow-lg backdrop-blur ${styles}`}>
      {toast.message}
    </div>
  );
}

function OrdersListSkeleton({ count = 4 }) {
  return (
    <div role="status" className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-brand-card border border-gray-700 rounded-2xl p-5 space-y-3">
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
        </div>
      ))}
    </div>
  );
}

export default function MyOrdersPage() {
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState(null);
  const [copiedRef, setCopiedRef] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);
  useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), []);

  const load = useCallback(async (signal) => {
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

      const [me, os] = await Promise.all([readJson(meRes), readJson(ordersRes)]);
      if (signal?.aborted) return;
      setProfile(me);
      setOrders(Array.isArray(os) ? os : []);
      setError("");
    } catch (e) {
      if (signal?.aborted) return;
      setError(e.message || "Something went wrong.");
    }
  }, [router]);

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

  useEffect(() => {
    function onStorage(e) {
      if (e.key?.startsWith("mrf_customer") && !getCustomerToken()) {
        router.replace("/account");
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [router]);

  const logout = useCallback(() => {
    clearCustomerTokens();
    router.push("/account");
  }, [router]);

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
        setCopiedRef(reference);
        setTimeout(() => setCopiedRef(null), 1500);
        showToast("Order reference copied");
      } catch {
        showToast("Couldn't copy", "error");
      }
    },
    [showToast]
  );

  const counts = useMemo(() => {
    const c = { all: orders.length, active: 0, delivered: 0, cancelled: 0 };
    for (const o of orders) {
      if (ACTIVE_STATUSES.has(o.status)) c.active++;
      else if (o.status === "delivered") c.delivered++;
      else if (["cancelled", "failed", "refunded"].includes(o.status)) c.cancelled++;
    }
    return c;
  }, [orders]);

  const visibleOrders = useMemo(() => {
    if (filter === "all") return orders;
    if (filter === "active") return orders.filter((o) => ACTIVE_STATUSES.has(o.status));
    if (filter === "delivered") return orders.filter((o) => o.status === "delivered");
    if (filter === "cancelled") return orders.filter((o) => ["cancelled", "failed", "refunded"].includes(o.status));
    return orders;
  }, [orders, filter]);

  return (
    <div className="min-h-screen bg-brand-dark text-gray-100">
      <AccountHeader profile={profile} onLogout={logout} activeTab="/account/orders" />

      <main className="max-w-4xl mx-auto p-6 space-y-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-extrabold text-white">
              My Orders
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              {loading ? "Loading…" : orders.length === 0 ? "No orders yet" : `${orders.length} order${orders.length === 1 ? "" : "s"}`}
            </p>
          </div>
          {hasActiveOrder && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-brand-gold/30 bg-brand-gold/10 text-brand-gold text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse" />
              Live
            </span>
          )}
        </div>

        {error && (
          <div role="alert" className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setReloadKey((k) => k + 1)} className="text-xs font-bold underline hover:no-underline">
              Retry
            </button>
          </div>
        )}

        {!loading && orders.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              const count = counts[f.key] ?? 0;
              const Icon = f.Icon;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  disabled={count === 0 && f.key !== "all"}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    active ? "bg-brand-gold text-brand-dark" : "bg-brand-card border border-gray-700 text-gray-300 hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {f.label}
                  {count > 0 && <span className={`ml-1 text-[10px] ${active ? "text-brand-dark/70" : "text-gray-500"}`}>{count}</span>}
                </button>
              );
            })}
          </div>
        )}

        {loading ? (
          <OrdersListSkeleton count={4} />
        ) : orders.length === 0 ? (
          <div className="bg-brand-card border border-gray-700 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-gray-600" />
            </div>
            <h2 className="font-bold text-white text-lg">No orders yet</h2>
            <p className="text-gray-400 text-sm mt-1 max-w-sm mx-auto">
              Once you place an order, you'll see it here with live tracking.
            </p>
            <Link href="/menu" className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-bold text-sm transition-colors">
              <Utensils className="w-4 h-4" />
              Start Ordering
            </Link>
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="bg-brand-card border border-gray-700 rounded-2xl p-10 text-center">
            <p className="text-gray-400 text-sm">No {filter} orders to show.</p>
            <button onClick={() => setFilter("all")} className="mt-3 text-brand-gold text-xs font-bold underline hover:no-underline">
              Show all orders
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleOrders.map((o) => {
              const isActive = ACTIVE_STATUSES.has(o.status);
              const isCancelled = ["cancelled", "failed", "refunded"].includes(o.status);
              const items = Array.isArray(o.items) ? o.items : [];
              const shownItems = items.slice(0, 3);
              const extraCount = items.length - shownItems.length;
              const wasCopied = copiedRef === o.reference;

              return (
                <article
                  key={o.id}
                  className="bg-brand-card border border-gray-700 rounded-2xl p-5 hover:border-gray-600 transition-colors"
                >
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <div className="min-w-0">
                      <button
                        onClick={() => copyRef(o.reference)}
                        className="inline-flex items-center gap-1.5 font-mono text-xs text-brand-gold font-bold hover:underline"
                      >
                        {o.reference}
                        {wasCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3 opacity-50" />}
                      </button>
                      <div className="text-[10px] text-gray-500 mt-1">
                        <time dateTime={o.created_at}>{formatDateTime(o.created_at)}</time>
                      </div>
                    </div>
                    <StatusBadge status={o.status} />
                  </div>

                  {items.length > 0 && (
                    <div className="space-y-1 text-xs text-gray-300 border-t border-gray-800 pt-3">
                      {shownItems.map((it, idx) => (
                        <div key={idx} className="flex justify-between gap-3">
                          <span className="truncate">
                            <span className="text-brand-gold font-bold">{it.quantity}×</span> {it.name}
                          </span>
                          <span className="shrink-0">
                            {formatGHS(safeNumber(it.unit_price) * safeNumber(it.quantity))}
                          </span>
                        </div>
                      ))}
                      {extraCount > 0 && (
                        <div className="text-[11px] text-gray-500 italic">
                          + {extraCount} more item{extraCount === 1 ? "" : "s"}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-800 gap-3">
                    <span className="text-xs text-gray-400 truncate inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {o.delivery_zone_name || "—"}
                    </span>
                    <span className="text-brand-gold font-bold shrink-0">{formatGHS(o.total)}</span>
                  </div>

                  <div className="mt-3 flex gap-2">
                    {isActive ? (
                      <Link href={`/order/${o.reference}`} className="flex-1 py-2 rounded-lg bg-brand-gold hover:bg-brand-amber text-brand-dark text-xs font-extrabold text-center inline-flex items-center justify-center gap-1.5 transition-colors">
                        <Bike className="w-3.5 h-3.5" />
                        Track Order
                      </Link>
                    ) : (
                      <Link href={`/order/${o.reference}`} className="flex-1 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold text-center transition-colors">
                        View Details
                      </Link>
                    )}
                    <Link href="/menu" className="flex-1 py-2 rounded-lg bg-brand-gold/20 hover:bg-brand-gold/30 text-brand-gold text-xs font-bold text-center inline-flex items-center justify-center gap-1.5 transition-colors">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      {isCancelled ? "Try Again" : "Order Again"}
                    </Link>
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