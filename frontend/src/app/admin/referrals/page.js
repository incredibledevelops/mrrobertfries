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

const STATUS_META = {
  pending: {
    label: "Pending",
    color: "text-amber-400",
    bg: "bg-amber-500/15 border-amber-500/30",
    emoji: "⏳",
  },
  completed: {
    label: "Completed",
    color: "text-emerald-400",
    bg: "bg-emerald-500/15 border-emerald-500/30",
    emoji: "🎉",
  },
  expired: {
    label: "Expired",
    color: "text-gray-400",
    bg: "bg-gray-500/15 border-gray-500/30",
    emoji: "⌛",
  },
  cancelled: {
    label: "Cancelled",
    color: "text-red-400",
    bg: "bg-red-500/15 border-red-500/30",
    emoji: "❌",
  },
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "completed", label: "Completed" },
  { key: "expired", label: "Expired" },
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

function formatGHS(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "GH₵ 0.00";
  return `GH₵ ${n.toFixed(2)}`;
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

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function normalizePhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10 && digits.startsWith("0")) return digits;
  if (digits.length === 12 && digits.startsWith("233"))
    return "0" + digits.slice(3);
  if (digits.length === 9) return "0" + digits;
  return null;
}

function isValidPhone(raw) {
  return !!normalizePhone(raw);
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

function Field({ label, htmlFor, hint, children }) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-xs font-bold text-gray-300 mb-1"
      >
        {label}
      </label>
      {children}
      {hint && <p className="text-[10px] text-gray-500 mt-1">{hint}</p>}
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
        className="relative bg-brand-card border border-gray-700 rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        {children}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || {
    label: status || "Unknown",
    color: "text-gray-300",
    bg: "bg-gray-500/15 border-gray-500/30",
    emoji: "•",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wide ${meta.color} ${meta.bg}`}
    >
      <span aria-hidden="true">{meta.emoji}</span>
      {meta.label}
    </span>
  );
}

function ReferralsSkeleton({ rows = 6 }) {
  return (
    <div
      role="status"
      aria-label="Loading referrals"
      className="bg-brand-card border border-gray-700 rounded-2xl divide-y divide-gray-800"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="p-4 flex items-center justify-between gap-3"
        >
          <div className="flex-1 space-y-2">
            <SkeletonLine className="h-4 w-24" />
            <SkeletonLine className="h-3 w-40" />
          </div>
          <SkeletonBlock className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminReferrals() {
  const router = useRouter();

  const [token, setToken] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    referrer_phone: "",
    referrer_name: "",
  });
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);

  const [busyIds, setBusyIds] = useState(() => new Set());
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
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

  /* ---------- load ALL referrals once; filter client-side ---------- */
  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await authFetch(`${API_URL}/api/v1/referrals`);
      if (!res.ok) throw new Error("Couldn't load referrals.");
      const data = await readJson(res);
      setReferrals(Array.isArray(data) ? data : []);
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

  /* ---------- create referral ---------- */
  const handleCreate = useCallback(
    async (e) => {
      e.preventDefault();
      setFormError("");

      const normalizedPhone = normalizePhone(form.referrer_phone);
      if (!normalizedPhone) {
        setFormError("Enter a valid Ghanaian phone number (e.g. 024XXXXXXX).");
        return;
      }
      if (!form.referrer_name.trim()) {
        setFormError("Referrer name is required.");
        return;
      }

      setCreating(true);
      try {
        const res = await authFetch(`${API_URL}/api/v1/referrals`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            referrer_phone: normalizedPhone,
            referrer_name: form.referrer_name.trim(),
          }),
        });
        if (!res.ok) {
          const err = await readJson(res);
          throw new Error(err.detail || "Couldn't create referral.");
        }
        const created = await readJson(res);

        setShowForm(false);
        setForm({ referrer_phone: "", referrer_name: "" });

        // Auto-copy the new code
        if (created?.code) {
          try {
            await navigator.clipboard?.writeText?.(created.code);
            showToast(`Code ${created.code} created & copied!`);
          } catch {
            showToast(`Code ${created.code} created!`);
          }
        } else {
          showToast("Referral code created.");
        }

        setReloadKey((k) => k + 1);
      } catch (err) {
        setFormError(err.message || "Couldn't create referral.");
      } finally {
        setCreating(false);
      }
    },
    [form, authFetch, showToast]
  );

  /* ---------- copy code ---------- */
  const copyCode = useCallback(
    async (code) => {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(code);
        } else {
          const ta = document.createElement("textarea");
          ta.value = code;
          ta.setAttribute("readonly", "");
          ta.style.position = "absolute";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        }
        showToast(`Copied ${code}`);
      } catch {
        showToast("Couldn't copy — long-press to select.", "error");
      }
    },
    [showToast]
  );

  /* ---------- derived ---------- */
  const counts = useMemo(() => {
    const c = { all: referrals.length, pending: 0, completed: 0, expired: 0, cancelled: 0 };
    for (const r of referrals) {
      if (c[r.status] != null) c[r.status]++;
    }
    return c;
  }, [referrals]);

  const aggregates = useMemo(() => {
    let completed = 0;
    let pending = 0;
    let totalGiven = 0;
    for (const r of referrals) {
      if (r.status === "completed") {
        completed++;
        totalGiven +=
          safeNumber(r.referrer_reward) + safeNumber(r.referee_reward);
      } else if (r.status === "pending") {
        pending++;
      }
    }
    return { completed, pending, totalGiven };
  }, [referrals]);

  const visibleReferrals = useMemo(() => {
    let list = referrals;
    if (filter !== "all") list = list.filter((r) => r.status === filter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.code?.toLowerCase().includes(q) ||
          r.referrer_name?.toLowerCase().includes(q) ||
          r.referrer_phone?.toLowerCase().includes(q) ||
          r.referee_name?.toLowerCase().includes(q) ||
          r.referee_phone?.toLowerCase().includes(q)
      );
    }
    // Sort: pending first, then by created_at desc
    return [...list].sort((a, b) => {
      const aPending = a.status === "pending" ? 0 : 1;
      const bPending = b.status === "pending" ? 0 : 1;
      if (aPending !== bPending) return aPending - bPending;
      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bDate - aDate;
    });
  }, [referrals, filter, query]);

  /* ---------- render guard ---------- */
  if (!authChecked || !token) {
    return (
      <div>
        <div className="h-8 w-48 rounded bg-gray-700/40 animate-pulse mb-6" />
        <ReferralsSkeleton rows={6} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-white">
            Referrals
          </h1>
          <p className="text-gray-400 text-sm mt-1 max-w-2xl">
            Track who's sharing codes and who's been rewarded.
          </p>
        </div>
        <button
          onClick={() => {
            setForm({ referrer_phone: "", referrer_name: "" });
            setFormError("");
            setShowForm(true);
          }}
          className="px-5 py-3 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-extrabold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/60"
        >
          + Generate Code
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <SummaryCard
          label="Completed Referrals"
          value={loading ? "—" : aggregates.completed}
          color="text-emerald-400"
        />
        <SummaryCard
          label="Pending"
          value={loading ? "—" : aggregates.pending}
          color="text-amber-400"
        />
        <SummaryCard
          label="Rewards Given"
          value={loading ? "—" : formatGHS(aggregates.totalGiven)}
          color="text-brand-gold"
        />
      </div>

      {/* Search + filters */}
      {!loading && referrals.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              🔍
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search code, name, phone…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-brand-card border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none transition-colors"
            />
          </div>
          <div
            role="tablist"
            aria-label="Filter referrals by status"
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

      {/* Content */}
      {loading ? (
        <ReferralsSkeleton rows={6} />
      ) : referrals.length === 0 ? (
        <div className="bg-brand-card border border-gray-700 rounded-2xl p-12 text-center">
          <div className="text-5xl mb-3" aria-hidden="true">
            🎁
          </div>
          <h2 className="font-bold text-white text-lg">No referrals yet</h2>
          <p className="text-gray-400 text-sm mt-1 max-w-sm mx-auto">
            Generate a code for a customer to get the referral program going.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-5 px-5 py-2.5 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-bold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/60"
          >
            Generate your first code
          </button>
        </div>
      ) : visibleReferrals.length === 0 ? (
        <div className="bg-brand-card border border-gray-700 rounded-2xl p-10 text-center">
          <p className="text-gray-400 text-sm">No referrals match your filters.</p>
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
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto bg-brand-card border border-gray-700 rounded-2xl">
            <table className="w-full text-sm">
              <caption className="sr-only">Referral list</caption>
              <thead className="sticky top-0 bg-brand-card">
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider">
                    Referrer
                  </th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider">
                    Referee
                  </th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider">
                    Rewards
                  </th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleReferrals.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() => copyCode(r.code)}
                        title="Copy code"
                        className="font-mono text-xs text-brand-gold font-bold hover:underline focus:outline-none focus:ring-2 focus:ring-brand-gold/40 rounded px-1 -mx-1"
                      >
                        {r.code}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-white truncate max-w-[160px]">
                        {r.referrer_name || "—"}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono">
                        {r.referrer_phone || ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {r.referee_name ? (
                        <>
                          <div className="text-white truncate max-w-[160px]">
                            {r.referee_name}
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono">
                            {r.referee_phone || ""}
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-brand-gold font-bold text-xs whitespace-nowrap">
                        {formatGHS(
                          safeNumber(r.referrer_reward) +
                            safeNumber(r.referee_reward)
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 whitespace-nowrap">
                        {formatGHS(r.referrer_reward)} + {formatGHS(r.referee_reward)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      <time dateTime={r.created_at}>
                        {formatDate(r.created_at)}
                      </time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {visibleReferrals.map((r) => (
              <div
                key={r.id}
                className="bg-brand-card border border-gray-700 rounded-2xl p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => copyCode(r.code)}
                    className="font-mono text-sm text-brand-gold font-bold hover:underline focus:outline-none rounded px-1 -mx-1"
                  >
                    {r.code}
                  </button>
                  <StatusBadge status={r.status} />
                </div>

                <div className="text-xs space-y-1">
                  <div>
                    <span className="text-gray-500">From:</span>{" "}
                    <span className="text-white">{r.referrer_name || "—"}</span>
                    <span className="text-gray-500 ml-1 font-mono text-[10px]">
                      {r.referrer_phone || ""}
                    </span>
                  </div>
                  {r.referee_name && (
                    <div>
                      <span className="text-gray-500">To:</span>{" "}
                      <span className="text-white">{r.referee_name}</span>
                      <span className="text-gray-500 ml-1 font-mono text-[10px]">
                        {r.referee_phone || ""}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-gray-800">
                  <span className="text-[11px] text-gray-500">
                    <time dateTime={r.created_at}>
                      {formatDate(r.created_at)}
                    </time>
                  </span>
                  <span className="text-brand-gold font-bold text-xs">
                    {formatGHS(
                      safeNumber(r.referrer_reward) +
                        safeNumber(r.referee_reward)
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ---------- Generate code modal ---------- */}
      {showForm && (
        <Modal
          onClose={() => setShowForm(false)}
          labelledBy="referral-form-title"
          disableClose={creating}
        >
          <form onSubmit={handleCreate} aria-busy={creating} className="p-6 space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-gray-700">
              <h3
                id="referral-form-title"
                className="font-heading text-lg font-bold text-white"
              >
                Generate Referral Code
              </h3>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={creating}
                aria-label="Close"
                className="text-gray-400 hover:text-white p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs"
              >
                {formError}
              </div>
            )}

            <Field
              label="Referrer Phone"
              htmlFor="referrer_phone"
              hint="We'll send the code here if you enable SMS."
            >
              <input
                id="referrer_phone"
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                autoFocus
                disabled={creating}
                value={form.referrer_phone}
                onChange={(e) =>
                  setForm({ ...form, referrer_phone: e.target.value })
                }
                placeholder="024XXXXXXX"
                aria-invalid={
                  form.referrer_phone.length > 0 &&
                  !isValidPhone(form.referrer_phone)
                }
                className={`w-full px-4 py-3 rounded-xl bg-brand-dark border text-white text-sm outline-none transition-colors focus:ring-2 disabled:opacity-60 ${
                  form.referrer_phone.length > 0 &&
                  !isValidPhone(form.referrer_phone)
                    ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30"
                    : "border-gray-700 focus:border-brand-gold focus:ring-brand-gold/40"
                }`}
              />
              {form.referrer_phone.length > 0 &&
                !isValidPhone(form.referrer_phone) && (
                  <p className="text-[11px] text-red-400 mt-1">
                    Enter a valid Ghanaian number (e.g. 024XXXXXXX)
                  </p>
                )}
            </Field>

            <Field label="Referrer Name" htmlFor="referrer_name">
              <input
                id="referrer_name"
                required
                autoComplete="name"
                disabled={creating}
                value={form.referrer_name}
                onChange={(e) =>
                  setForm({ ...form, referrer_name: e.target.value })
                }
                placeholder="Kwadwo Mensah"
                className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none transition-colors disabled:opacity-60"
              />
            </Field>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={creating}
                className="flex-1 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white font-bold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  creating ||
                  !isValidPhone(form.referrer_phone) ||
                  !form.referrer_name.trim()
                }
                className="flex-1 py-3 rounded-xl bg-brand-gold hover:bg-brand-amber disabled:opacity-50 disabled:cursor-not-allowed text-brand-dark font-extrabold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/60"
              >
                {creating ? "Generating…" : "Generate Code"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <Toast toast={toast} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  small bits                                                         */
/* ------------------------------------------------------------------ */

function SummaryCard({ label, value, color }) {
  return (
    <div className="bg-brand-card border border-gray-700 rounded-2xl p-5">
      <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">
        {label}
      </div>
      <div className={`text-2xl font-black mt-1 ${color}`}>{value}</div>
    </div>
  );
}