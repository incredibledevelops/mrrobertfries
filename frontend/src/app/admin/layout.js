"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const TOKEN_KEY = "mrf_token";
const TOKEN_ISSUED_AT_KEY = "mrf_token_issued_at";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const TABS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/menu", label: "Menu Items" },
  { href: "/admin/builder", label: "Builder Options" },
  { href: "/admin/zones", label: "Delivery Zones" },
  { href: "/admin/branches", label: "Branches" },
  { href: "/admin/promo-codes", label: "Promo Codes" },
  { href: "/admin/referrals", label: "Referrals" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/profile", label: "Profile" },
];

function getValidToken() {
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

function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_ISSUED_AT_KEY);
  } catch {}
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

function AdminShellSkeleton() {
  return (
    <div className="min-h-screen bg-brand-dark text-gray-100">
      <div className="border-b border-gray-800 bg-brand-card/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-700/60 animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-4 w-24 rounded bg-gray-700/60 animate-pulse" />
              <div className="h-2.5 w-32 rounded bg-gray-700/40 animate-pulse" />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="h-8 w-20 rounded-xl bg-gray-700/40 animate-pulse" />
            <div className="h-8 w-16 rounded-xl bg-gray-700/60 animate-pulse" />
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 flex gap-2 pb-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-24 rounded-lg bg-gray-700/40 animate-pulse"
            />
          ))}
        </div>
      </div>
      <div className="max-w-7xl mx-auto p-6">
        <div className="h-64 rounded-2xl bg-gray-700/30 animate-pulse" />
      </div>
    </div>
  );
}

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin";

  const [authChecked, setAuthChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const activeTabRef = useRef(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);
  useEffect(
    () => () => toastTimer.current && clearTimeout(toastTimer.current),
    []
  );

  useEffect(() => {
    if (isLoginPage) {
      setAuthChecked(true);
      setAuthed(false);
      return;
    }
    const token = getValidToken();
    if (!token) {
      router.replace("/admin");
      return;
    }
    setAuthed(true);
    setAuthChecked(true);
  }, [isLoginPage, router, pathname]);

  useEffect(() => {
    if (isLoginPage) return;
    function onStorage(e) {
      if (e.key === TOKEN_KEY) {
        if (!e.newValue) router.replace("/admin");
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [isLoginPage, router]);

  useEffect(() => {
    activeTabRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [pathname]);

  useEffect(() => {
    if (!confirmLogout) return;
    function onKey(e) {
      if (e.key === "Escape") setConfirmLogout(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmLogout]);

  useEffect(() => {
    if (!confirmLogout) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [confirmLogout]);

  const doLogout = useCallback(() => {
    clearToken();
    setConfirmLogout(false);
    showToast("Signed out.");
    router.push("/admin");
  }, [router, showToast]);

  const activeHref = useMemo(() => {
    const matches = TABS.filter(
      (t) => pathname === t.href || pathname.startsWith(t.href + "/")
    );
    if (matches.length === 0) return "";
    return matches.sort((a, b) => b.href.length - a.href.length)[0].href;
  }, [pathname]);

  if (isLoginPage) return children;
  if (!authChecked || !authed) return <AdminShellSkeleton />;

  return (
    <div className="min-h-screen bg-brand-dark text-gray-100">
      <a
        href="#admin-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-brand-gold focus:text-brand-dark focus:font-bold focus:shadow-lg"
      >
        Skip to content
      </a>

      <header className="border-b border-gray-800 bg-brand-card/50 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-gold/40"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-gold to-brand-crimson flex items-center justify-center text-brand-dark font-black">
              MR
            </div>
            <div>
              <div className="font-heading text-lg font-black text-white leading-none">
                Admin Panel
              </div>
              <div className="text-[10px] text-gray-400 tracking-widest uppercase">
                Mr. Robert's Fries
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-200 transition-colors"
            >
              View Site ↗
            </Link>
            <button
              onClick={() => setConfirmLogout(true)}
              className="px-4 py-2 rounded-xl bg-brand-crimson hover:bg-red-700 text-xs font-bold text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        <nav
          aria-label="Admin sections"
          className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto no-scrollbar"
        >
          {TABS.map((tab) => {
            const active = tab.href === activeHref;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                ref={active ? activeTabRef : null}
                aria-current={active ? "page" : undefined}
                className={`px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors rounded-t-md ${
                  active
                    ? "border-brand-gold text-brand-gold"
                    : "border-transparent text-gray-400 hover:text-white"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main id="admin-content" className="max-w-7xl mx-auto p-4 sm:p-6">
        {children}
      </main>

      {confirmLogout && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-logout-title"
        >
          <div
            onClick={() => setConfirmLogout(false)}
            className="absolute inset-0 bg-black/70"
          />
          <div className="relative bg-brand-card border border-gray-700 rounded-3xl max-w-sm w-full p-6 space-y-4">
            <h2
              id="admin-logout-title"
              className="font-heading text-lg font-bold text-white"
            >
              Sign out of admin?
            </h2>
            <p className="text-xs text-gray-400">
              You'll need to sign in again to access the admin panel.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setConfirmLogout(false)}
                className="flex-1 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={doLogout}
                autoFocus
                className="flex-1 py-3 rounded-xl bg-brand-crimson hover:bg-red-700 text-white font-bold text-sm"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} />
    </div>
  );
}