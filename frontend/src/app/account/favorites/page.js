"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart,
  Star,
  ShoppingBag,
  Utensils,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { API_URL } from "@/lib/api";
import {
  getCustomerToken,
  clearCustomerTokens,
  customerFetch,
} from "@/lib/customerAuth";
import { AccountHeader } from "../page";
import { SkeletonBlock, SkeletonLine } from "@/components/Skeleton";

const REMOVE_METHOD = "DELETE";
const REMOVE_PATH = (id) => `${API_URL}/api/v1/customer-account/favorites/${id}`;

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

function ImageWithFallback({ src, alt, className }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-800`} role="img" aria-label={alt}>
        <Utensils className="w-10 h-10 text-gray-600" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => setFailed(true)}
    />
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

function FavoritesGridSkeleton({ count = 4 }) {
  return (
    <div role="status" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-brand-card border border-gray-700 rounded-2xl overflow-hidden">
          <SkeletonBlock className="h-40 rounded-none" />
          <div className="p-5 space-y-3">
            <SkeletonLine className="h-5 w-3/4" />
            <SkeletonLine className="h-3 w-1/3" />
            <div className="flex items-center justify-between pt-2">
              <SkeletonLine className="h-4 w-16" />
              <SkeletonBlock className="h-8 w-20 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FavoritesPage() {
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [busyIds, setBusyIds] = useState(() => new Set());
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);
  useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), []);

  useEffect(() => {
    if (!getCustomerToken()) {
      router.replace("/account");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");

    (async () => {
      try {
        const [meRes, favRes] = await Promise.all([
          customerFetch(`${API_URL}/api/v1/customer-account/me`),
          customerFetch(`${API_URL}/api/v1/customer-account/favorites`),
        ]);

        if (meRes.status === 401 || favRes.status === 401) {
          clearCustomerTokens();
          router.replace("/account");
          return;
        }
        if (!meRes.ok || !favRes.ok) {
          throw new Error("Couldn't load your favorites.");
        }

        const [me, favs] = await Promise.all([readJson(meRes), readJson(favRes)]);
        if (cancelled) return;
        setProfile(me);
        setFavorites(Array.isArray(favs) ? favs : []);
      } catch (e) {
        if (!cancelled) setError(e.message || "Something went wrong.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, reloadKey]);

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

  const removeFavorite = useCallback(
    async (item) => {
      const id = item?.id;
      if (id == null) return;
      if (busyIds.has(id)) return;

      const prev = favorites;
      setFavorites((list) => list.filter((f) => f.id !== id));
      setBusyIds((s) => new Set(s).add(id));

      try {
        const res = await customerFetch(REMOVE_PATH(id), { method: REMOVE_METHOD });
        if (res.status === 401) {
          clearCustomerTokens();
          router.replace("/account");
          return;
        }
        if (!res.ok && res.status !== 204) {
          const err = await readJson(res);
          throw new Error(err.detail || "Couldn't remove favorite.");
        }
        showToast("Removed from favorites.");
      } catch (e) {
        setFavorites(prev);
        showToast(e.message || "Couldn't remove favorite.", "error");
      } finally {
        setBusyIds((s) => {
          const next = new Set(s);
          next.delete(id);
          return next;
        });
      }
    },
    [favorites, busyIds, router, showToast]
  );

  const count = favorites.length;
  const summary = useMemo(() => {
    if (loading) return "Loading…";
    if (count === 0) return "Nothing saved yet";
    return `${count} saved item${count === 1 ? "" : "s"}`;
  }, [loading, count]);

  return (
    <div className="min-h-screen bg-brand-dark text-gray-100">
      <AccountHeader profile={profile} onLogout={logout} activeTab="/account/favorites" />

      <main className="max-w-5xl mx-auto p-6 space-y-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-extrabold text-white">
              My Favorites
            </h1>
            <p className="text-xs text-gray-400 mt-1">{summary}</p>
          </div>
          {count > 0 && (
            <Link
              href="/menu"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs transition-colors"
            >
              <Utensils className="w-3.5 h-3.5" />
              Browse menu
            </Link>
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

        {loading ? (
          <FavoritesGridSkeleton count={4} />
        ) : count === 0 ? (
          <div className="bg-brand-card border border-gray-700 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-gray-600" />
            </div>
            <h2 className="font-bold text-white text-lg">No favorites yet</h2>
            <p className="text-gray-400 text-sm mt-1 max-w-md mx-auto">
              Tap the heart on any menu item to save it here. Favorites also
              appear automatically after your first order.
            </p>
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-bold text-sm transition-colors"
            >
              <Utensils className="w-4 h-4" />
              Explore the Menu
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map((item) => {
              const busy = busyIds.has(item.id);
              const rating = safeNumber(item.average_rating);
              const reviews = safeNumber(item.total_reviews);
              return (
                <div
                  key={item.id}
                  className={`bg-brand-card border border-gray-700 rounded-2xl overflow-hidden flex flex-col transition-all hover:border-brand-gold/60 hover:-translate-y-0.5 ${busy ? "opacity-60" : ""}`}
                >
                  <Link href={`/menu/${item.slug}`} className="block relative">
                    <ImageWithFallback src={item.image_url} alt={item.name} className="w-full h-40 object-cover" />
                    {reviews > 0 && (
                      <div className="absolute top-3 left-3 bg-brand-dark/90 backdrop-blur-sm px-2 py-1 rounded-lg inline-flex items-center gap-1 text-xs font-bold border border-gray-700">
                        <Star className="w-3 h-3 text-brand-gold fill-brand-gold" />
                        <span className="text-white">{rating.toFixed(1)}</span>
                        <span className="text-gray-500">({reviews})</span>
                      </div>
                    )}
                  </Link>

                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/menu/${item.slug}`}
                        className="font-heading font-bold text-lg text-white hover:text-brand-gold transition-colors"
                      >
                        {item.name}
                      </Link>
                      <button
                        onClick={() => removeFavorite(item)}
                        disabled={busy}
                        aria-label={`Remove ${item.name} from favorites`}
                        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                      >
                        {busy ? (
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-red-400/40 border-t-red-400 animate-spin" />
                        ) : (
                          <Heart className="w-4 h-4 fill-red-500" />
                        )}
                      </button>
                    </div>

                    {item.category_name && (
                      <div className="text-[11px] text-gray-500 mt-1">
                        {item.category_name}
                      </div>
                    )}

                    <div className="mt-auto pt-4 flex items-center justify-between gap-3">
                      <div className="text-brand-gold font-bold">
                        {formatGHS(item.price)}
                      </div>
                      <Link
                        href={`/menu/${item.slug}`}
                        className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-brand-gold hover:bg-brand-amber text-brand-dark text-xs font-extrabold transition-colors"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        Order
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Toast toast={toast} />
    </div>
  );
}