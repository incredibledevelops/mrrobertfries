"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  AlertCircle,
  RefreshCw,
  Ticket,
  Check,
  XCircle,
  Pause,
  Hourglass,
  Flame,
  Copy,
  Dice5,
  Power,
  PowerOff,
} from "lucide-react";
import { API_URL } from "@/lib/api";
import { SkeletonBlock, SkeletonLine } from "@/components/Skeleton";

const TOKEN_KEY = "mrf_token";
const TOKEN_ISSUED_AT_KEY = "mrf_token_issued_at";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const CODE_RE = /^[A-Z0-9]{3,20}$/;

const EMPTY_FORM = {
  code: "",
  description: "",
  discount_type: "percent",
  discount_value: 10,
  min_order_total: 0,
  max_discount: "",
  usage_limit: "",
  per_customer_limit: 1,
  valid_from: "",
  valid_until: "",
  is_active: true,
};

const SUGGESTED_CODES = ["WELCOME10", "FRIES20", "MOMO15", "WEEKEND5"];

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

function formatDiscount(promo) {
  if (promo.discount_type === "percent") {
    return `${safeNumber(promo.discount_value)}% off`;
  }
  if (promo.discount_type === "fixed") {
    return `${formatGHS(promo.discount_value)} off`;
  }
  return "Free delivery";
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

function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isExpired(promo) {
  return (
    promo.valid_until && new Date(promo.valid_until).getTime() < Date.now()
  );
}

function isExhausted(promo) {
  return (
    promo.usage_limit != null &&
    safeNumber(promo.times_used) >= safeNumber(promo.usage_limit)
  );
}

function getStatus(promo) {
  if (!promo.is_active) return "disabled";
  if (isExpired(promo)) return "expired";
  if (isExhausted(promo)) return "exhausted";
  return "active";
}

const STATUS_META = {
  active: {
    label: "Active",
    color: "text-emerald-400",
    bg: "bg-emerald-500/15 border-emerald-500/30",
    Icon: Check,
  },
  disabled: {
    label: "Disabled",
    color: "text-red-400",
    bg: "bg-red-500/15 border-red-500/30",
    Icon: Pause,
  },
  expired: {
    label: "Expired",
    color: "text-gray-400",
    bg: "bg-gray-500/15 border-gray-500/30",
    Icon: Hourglass,
  },
  exhausted: {
    label: "Exhausted",
    color: "text-amber-400",
    bg: "bg-amber-500/15 border-amber-500/30",
    Icon: Flame,
  },
};

function Toast({ toast }) {
  if (!toast) return null;
  const isError = toast.type === "error";
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-xl border text-sm font-semibold shadow-lg backdrop-blur ${
        isError
          ? "bg-red-950/90 border-red-700 text-red-200"
          : "bg-emerald-950/90 border-emerald-700 text-emerald-200"
      }`}
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
        className="relative bg-brand-card border border-gray-700 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        {children}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.active;
  const Icon = meta.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wide ${meta.color} ${meta.bg}`}
    >
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
}

function PromoGridSkeleton({ count = 6 }) {
  return (
    <div
      role="status"
      aria-label="Loading promo codes"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-brand-card border border-gray-700 rounded-2xl p-5 space-y-3"
        >
          <div className="flex justify-between items-start">
            <SkeletonLine className="h-6 w-32" />
            <SkeletonBlock className="h-5 w-20 rounded" />
          </div>
          <SkeletonLine className="h-3 w-3/4" />
          <div className="space-y-2 pt-3">
            <SkeletonLine className="h-3 w-full" />
            <SkeletonLine className="h-3 w-2/3" />
          </div>
          <div className="flex gap-2 pt-3">
            <SkeletonBlock className="h-8 flex-1 rounded-lg" />
            <SkeletonBlock className="h-8 flex-1 rounded-lg" />
            <SkeletonBlock className="h-8 w-10 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminPromoCodes() {
  const router = useRouter();

  const [token, setToken] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await authFetch(`${API_URL}/api/v1/promo-codes`);
      if (!res.ok) throw new Error("Couldn't load promo codes.");
      const data = await readJson(res);
      setPromos(Array.isArray(data) ? data : []);
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

  const openCreate = useCallback(() => {
    setForm({ ...EMPTY_FORM });
    setEditing(null);
    setFormError("");
    setShowForm(true);
  }, []);

  const openEdit = useCallback((promo) => {
    setForm({
      code: promo.code || "",
      description: promo.description || "",
      discount_type: promo.discount_type || "percent",
      discount_value: promo.discount_value ?? 10,
      min_order_total: promo.min_order_total ?? 0,
      max_discount: promo.max_discount ?? "",
      usage_limit: promo.usage_limit ?? "",
      per_customer_limit: promo.per_customer_limit ?? 1,
      valid_from: toLocalInput(promo.valid_from),
      valid_until: toLocalInput(promo.valid_until),
      is_active: !!promo.is_active,
    });
    setEditing(promo);
    setFormError("");
    setShowForm(true);
  }, []);

  const suggestCode = useCallback(() => {
    const base = SUGGESTED_CODES[Math.floor(Math.random() * SUGGESTED_CODES.length)];
    const suffix = Math.floor(10 + Math.random() * 90);
    setForm((f) => ({ ...f, code: `${base}${suffix}` }));
  }, []);

  const validation = useMemo(() => {
    const errs = {};
    const code = form.code.trim().toUpperCase();

    if (!code) errs.code = "Code is required.";
    else if (!CODE_RE.test(code))
      errs.code = "Use 3–20 letters/numbers, no spaces.";

    if (
      form.discount_type !== "free_delivery" &&
      (form.discount_value === "" ||
        !Number.isFinite(Number(form.discount_value)) ||
        Number(form.discount_value) <= 0)
    ) {
      errs.discount_value = "Must be greater than 0.";
    }
    if (
      form.discount_type === "percent" &&
      Number(form.discount_value) > 100
    ) {
      errs.discount_value = "Percent can't exceed 100.";
    }
    if (
      form.min_order_total !== "" &&
      (!Number.isFinite(Number(form.min_order_total)) ||
        Number(form.min_order_total) < 0)
    ) {
      errs.min_order_total = "Must be 0 or higher.";
    }
    if (
      form.max_discount !== "" &&
      (!Number.isFinite(Number(form.max_discount)) ||
        Number(form.max_discount) <= 0)
    ) {
      errs.max_discount = "Must be greater than 0.";
    }
    if (
      form.usage_limit !== "" &&
      (!Number.isFinite(Number(form.usage_limit)) ||
        Number(form.usage_limit) < 1)
    ) {
      errs.usage_limit = "Must be at least 1.";
    }
    if (
      form.per_customer_limit !== "" &&
      (!Number.isFinite(Number(form.per_customer_limit)) ||
        Number(form.per_customer_limit) < 1)
    ) {
      errs.per_customer_limit = "Must be at least 1.";
    }
    if (form.valid_from && form.valid_until) {
      const from = new Date(form.valid_from).getTime();
      const until = new Date(form.valid_until).getTime();
      if (from >= until) {
        errs.valid_until = "Must be after the start date.";
      }
    }
    return errs;
  }, [form]);

  const formValid = Object.keys(validation).length === 0;

  const discountPreview = useMemo(() => {
    if (form.discount_type === "free_delivery") {
      return "Free delivery on qualifying orders";
    }
    const sampleOrder = Math.max(
      safeNumber(form.min_order_total, 0) || 50,
      50
    );
    const value = safeNumber(form.discount_value);
    let discount = 0;
    if (form.discount_type === "percent") {
      discount = (sampleOrder * value) / 100;
      if (form.max_discount !== "") {
        discount = Math.min(discount, safeNumber(form.max_discount));
      }
    } else {
      discount = value;
    }
    discount = Math.min(discount, sampleOrder);
    return `On a ${formatGHS(sampleOrder)} order → ${formatGHS(discount)} off`;
  }, [form]);

  const handleSave = useCallback(
    async (e) => {
      e.preventDefault();
      if (!formValid) {
        setFormError("Please fix the highlighted fields.");
        return;
      }

      const payload = {
        code: form.code.trim().toUpperCase(),
        description: form.description?.trim() || null,
        discount_type: form.discount_type,
        discount_value:
          form.discount_type === "free_delivery"
            ? 0
            : safeNumber(form.discount_value, 0),
        min_order_total: safeNumber(form.min_order_total, 0),
        max_discount:
          form.discount_type === "percent" && form.max_discount !== ""
            ? safeNumber(form.max_discount, 0)
            : null,
        usage_limit:
          form.usage_limit === "" ? null : safeNumber(form.usage_limit, 0),
        per_customer_limit: safeNumber(form.per_customer_limit, 1),
        valid_from: form.valid_from
          ? new Date(form.valid_from).toISOString()
          : null,
        valid_until: form.valid_until
          ? new Date(form.valid_until).toISOString()
          : null,
        is_active: !!form.is_active,
      };

      const url = editing
        ? `${API_URL}/api/v1/promo-codes/${editing.id}`
        : `${API_URL}/api/v1/promo-codes`;
      const method = editing ? "PATCH" : "POST";

      setSaving(true);
      setFormError("");
      try {
        const res = await authFetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await readJson(res);
          throw new Error(err.detail || "Save failed.");
        }
        setShowForm(false);
        showToast(editing ? "Promo code updated." : "Promo code created.");
        setReloadKey((k) => k + 1);
      } catch (err) {
        setFormError(err.message || "Save failed.");
      } finally {
        setSaving(false);
      }
    },
    [form, formValid, editing, authFetch, showToast]
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const promo = deleteTarget;
    setDeleting(true);
    setBusyIds((s) => new Set(s).add(promo.id));
    try {
      const res = await authFetch(
        `${API_URL}/api/v1/promo-codes/${promo.id}`,
        { method: "DELETE" }
      );
      if (!res.ok && res.status !== 204) {
        const err = await readJson(res);
        throw new Error(err.detail || "Delete failed.");
      }
      setPromos((prev) => prev.filter((p) => p.id !== promo.id));
      showToast("Promo code deleted.");
      setDeleteTarget(null);
    } catch (err) {
      showToast(err.message || "Delete failed.", "error");
    } finally {
      setDeleting(false);
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(promo.id);
        return next;
      });
    }
  }, [deleteTarget, authFetch, showToast]);

  const toggleActive = useCallback(
    async (promo) => {
      if (busyIds.has(promo.id)) return;
      const prev = promos;
      const next = !promo.is_active;

      setPromos((list) =>
        list.map((p) => (p.id === promo.id ? { ...p, is_active: next } : p))
      );
      setBusyIds((s) => new Set(s).add(promo.id));

      try {
        const res = await authFetch(
          `${API_URL}/api/v1/promo-codes/${promo.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_active: next }),
          }
        );
        if (!res.ok) {
          const err = await readJson(res);
          throw new Error(err.detail || "Toggle failed.");
        }
        const updated = await readJson(res);
        if (updated?.id) {
          setPromos((list) =>
            list.map((p) => (p.id === updated.id ? updated : p))
          );
        }
        showToast(next ? "Promo enabled." : "Promo disabled.");
      } catch (err) {
        setPromos(prev);
        showToast(err.message || "Toggle failed.", "error");
      } finally {
        setBusyIds((s) => {
          const out = new Set(s);
          out.delete(promo.id);
          return out;
        });
      }
    },
    [promos, busyIds, authFetch, showToast]
  );

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

  const counts = useMemo(() => {
    const c = { all: promos.length, active: 0, disabled: 0, expired: 0, exhausted: 0 };
    for (const p of promos) c[getStatus(p)]++;
    return c;
  }, [promos]);

  const visiblePromos = useMemo(() => {
    let list = promos;
    if (statusFilter !== "all") {
      list = list.filter((p) => getStatus(p) === statusFilter);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.code?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      const aActive = a.is_active && !isExpired(a) && !isExhausted(a);
      const bActive = b.is_active && !isExpired(b) && !isExhausted(b);
      if (aActive !== bActive) return aActive ? -1 : 1;
      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bDate - aDate;
    });
  }, [promos, statusFilter, query]);

  if (!authChecked || !token) {
    return (
      <div>
        <div className="h-8 w-48 rounded bg-gray-700/40 animate-pulse mb-6" />
        <PromoGridSkeleton count={6} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-white">
            Promo Codes
          </h1>
          <p className="text-gray-400 text-sm mt-1 max-w-2xl">
            Discount codes customers can enter at checkout.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-extrabold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/60"
        >
          <Plus className="w-4 h-4" />
          New Promo
        </button>
      </div>

      {!loading && promos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search codes…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-brand-card border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none transition-colors"
            />
          </div>
          <div
            role="tablist"
            aria-label="Filter by status"
            className="flex gap-1 bg-brand-card border border-gray-700 rounded-xl p-1 overflow-x-auto no-scrollbar"
          >
            {[
              { key: "all", label: `All (${counts.all})` },
              { key: "active", label: `${counts.active} Active`, Icon: Check },
              { key: "disabled", label: `${counts.disabled}`, Icon: Pause },
              { key: "expired", label: `${counts.expired}`, Icon: Hourglass },
              { key: "exhausted", label: `${counts.exhausted}`, Icon: Flame },
            ].map((f) => (
              <button
                key={f.key}
                role="tab"
                aria-selected={statusFilter === f.key}
                onClick={() => setStatusFilter(f.key)}
                disabled={counts[f.key] === 0 && f.key !== "all"}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/40 disabled:opacity-40 disabled:cursor-not-allowed ${
                  statusFilter === f.key
                    ? "bg-brand-gold text-brand-dark"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {f.Icon && <f.Icon className="w-3.5 h-3.5" />}
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="flex items-center gap-1 text-xs font-bold underline hover:no-underline"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <PromoGridSkeleton count={6} />
      ) : promos.length === 0 ? (
        <div className="bg-brand-card border border-gray-700 rounded-2xl p-12 text-center">
          <Ticket className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h2 className="font-bold text-white text-lg">No promo codes yet</h2>
          <p className="text-gray-400 text-sm mt-1 max-w-sm mx-auto">
            Create discount codes to reward customers and boost orders.
          </p>
          <button
            onClick={openCreate}
            className="mt-5 px-5 py-2.5 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-bold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/60"
          >
            Create your first promo
          </button>
        </div>
      ) : visiblePromos.length === 0 ? (
        <div className="bg-brand-card border border-gray-700 rounded-2xl p-10 text-center">
          <p className="text-gray-400 text-sm">No promos match your filters.</p>
          <button
            onClick={() => {
              setQuery("");
              setStatusFilter("all");
            }}
            className="mt-3 text-brand-gold text-xs font-bold underline hover:no-underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visiblePromos.map((promo) => {
            const status = getStatus(promo);
            const busy = busyIds.has(promo.id);
            const usagePct =
              promo.usage_limit != null && safeNumber(promo.usage_limit) > 0
                ? Math.min(
                    100,
                    (safeNumber(promo.times_used) /
                      safeNumber(promo.usage_limit)) *
                      100
                  )
                : null;
            const inactive = status !== "active";

            return (
              <article
                key={promo.id}
                aria-busy={busy}
                className={`bg-brand-card border rounded-2xl p-5 transition-all flex flex-col ${
                  inactive
                    ? "border-gray-800 opacity-70"
                    : "border-gray-700 hover:border-gray-600"
                } ${busy ? "opacity-60" : ""}`}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <button
                      onClick={() => copyCode(promo.code)}
                      title="Copy code"
                      className="font-mono text-lg font-black text-brand-gold hover:underline focus:outline-none focus:ring-2 focus:ring-brand-gold/40 rounded px-1 -mx-1 flex items-center gap-1.5"
                    >
                      {promo.code}
                      <Copy className="w-3.5 h-3.5 opacity-60" />
                    </button>
                    {promo.description && (
                      <div className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {promo.description}
                      </div>
                    )}
                  </div>
                  <StatusBadge status={status} />
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <Row label="Discount" value={formatDiscount(promo)} />
                  {safeNumber(promo.min_order_total) > 0 && (
                    <Row
                      label="Min order"
                      value={formatGHS(promo.min_order_total)}
                    />
                  )}
                  {promo.max_discount != null && (
                    <Row
                      label="Max discount"
                      value={formatGHS(promo.max_discount)}
                    />
                  )}
                  <Row
                    label="Used"
                    value={`${safeNumber(promo.times_used)}${
                      promo.usage_limit ? ` / ${safeNumber(promo.usage_limit)}` : ""
                    }`}
                  />
                  {promo.valid_until && (
                    <Row
                      label="Expires"
                      value={formatDate(promo.valid_until)}
                      valueClass={
                        status === "expired" ? "text-red-400" : "text-white"
                      }
                    />
                  )}
                </div>

                {usagePct != null && (
                  <div className="mt-3">
                    <div
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(usagePct)}
                      aria-label="Promo usage"
                      className="h-1.5 rounded-full bg-gray-800 overflow-hidden"
                    >
                      <div
                        className={`h-full rounded-full transition-all motion-reduce:transition-none ${
                          usagePct >= 90
                            ? "bg-red-500"
                            : usagePct >= 60
                            ? "bg-amber-500"
                            : "bg-gradient-to-r from-brand-amber to-brand-gold"
                        }`}
                        style={{ width: `${usagePct}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-auto pt-4 flex gap-2">
                  <button
                    onClick={() => openEdit(promo)}
                    disabled={busy}
                    className="flex-1 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-600 flex items-center justify-center gap-1"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => toggleActive(promo)}
                    disabled={busy}
                    className="flex-1 py-2 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 disabled:opacity-50 text-amber-400 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/40 flex items-center justify-center gap-1"
                  >
                    {busy ? (
                      "…"
                    ) : promo.is_active ? (
                      <>
                        <PowerOff className="w-3 h-3" />
                        Disable
                      </>
                    ) : (
                      <>
                        <Power className="w-3 h-3" />
                        Enable
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(promo)}
                    disabled={busy}
                    aria-label={`Delete promo ${promo.code}`}
                    className="px-3 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 disabled:opacity-50 text-red-400 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {showForm && (
        <Modal
          onClose={() => setShowForm(false)}
          labelledBy="promo-form-title"
          disableClose={saving}
        >
          <form onSubmit={handleSave} aria-busy={saving} className="p-6 space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-gray-700">
              <h3
                id="promo-form-title"
                className="font-heading text-lg font-bold text-white"
              >
                {editing ? "Edit Promo Code" : "New Promo Code"}
              </h3>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={saving}
                aria-label="Close"
                className="text-gray-400 hover:text-white p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {formError}
              </div>
            )}

            <div className="p-3 rounded-xl bg-brand-dark border border-gray-700">
              <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">
                Preview
              </div>
              <div className="text-sm text-white">
                <span className="font-mono font-bold text-brand-gold">
                  {form.code || "CODE"}
                </span>{" "}
                — {discountPreview}
              </div>
            </div>

            <Field label="Code" htmlFor="code">
              <div className="flex gap-2">
                <input
                  id="code"
                  required
                  autoFocus
                  disabled={saving}
                  value={form.code}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      code: e.target.value
                        .toUpperCase()
                        .replace(/\s+/g, "")
                        .slice(0, 20),
                    })
                  }
                  placeholder="WELCOME10"
                  aria-invalid={!!validation.code}
                  className={`flex-1 px-4 py-3 rounded-xl bg-brand-dark border text-white font-mono text-sm outline-none transition-colors focus:ring-2 disabled:opacity-60 ${
                    validation.code
                      ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30"
                      : "border-gray-700 focus:border-brand-gold focus:ring-brand-gold/40"
                  }`}
                />
                {!editing && (
                  <button
                    type="button"
                    onClick={suggestCode}
                    disabled={saving}
                    title="Suggest a code"
                    className="px-3 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-600"
                  >
                    <Dice5 className="w-4 h-4" />
                  </button>
                )}
              </div>
              {validation.code && (
                <p className="text-[11px] text-red-400 mt-1">
                  {validation.code}
                </p>
              )}
            </Field>

            <Field label="Description" htmlFor="description">
              <input
                id="description"
                disabled={saving}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="10% off your first order"
                className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none transition-colors disabled:opacity-60"
              />
            </Field>

            <Field label="Discount Type">
              <div
                role="radiogroup"
                aria-label="Discount type"
                className="grid grid-cols-3 gap-2"
              >
                {[
                  { key: "percent", label: "% off" },
                  { key: "fixed", label: "GH₵ off" },
                  { key: "free_delivery", label: "Free delivery" },
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    role="radio"
                    aria-checked={form.discount_type === t.key}
                    disabled={saving}
                    onClick={() =>
                      setForm({ ...form, discount_type: t.key })
                    }
                    className={`py-2.5 rounded-xl text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/50 disabled:opacity-50 ${
                      form.discount_type === t.key
                        ? "bg-brand-gold text-brand-dark"
                        : "bg-brand-dark border border-gray-700 text-gray-300 hover:text-white"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field
                label={
                  form.discount_type === "percent"
                    ? "Percent (%)"
                    : form.discount_type === "fixed"
                    ? "Amount (GH₵)"
                    : "Amount (n/a)"
                }
                htmlFor="discount_value"
              >
                <input
                  id="discount_value"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  disabled={saving || form.discount_type === "free_delivery"}
                  value={form.discount_value}
                  onChange={(e) =>
                    setForm({ ...form, discount_value: e.target.value })
                  }
                  aria-invalid={!!validation.discount_value}
                  className={`w-full px-4 py-3 rounded-xl bg-brand-dark border text-white text-sm outline-none transition-colors focus:ring-2 disabled:opacity-50 ${
                    validation.discount_value
                      ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30"
                      : "border-gray-700 focus:border-brand-gold focus:ring-brand-gold/40"
                  }`}
                />
                {validation.discount_value && (
                  <p className="text-[11px] text-red-400 mt-1">
                    {validation.discount_value}
                  </p>
                )}
              </Field>
              <Field label="Min Order (GH₵)" htmlFor="min_order_total">
                <input
                  id="min_order_total"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  disabled={saving}
                  value={form.min_order_total}
                  onChange={(e) =>
                    setForm({ ...form, min_order_total: e.target.value })
                  }
                  aria-invalid={!!validation.min_order_total}
                  className={`w-full px-4 py-3 rounded-xl bg-brand-dark border text-white text-sm outline-none transition-colors focus:ring-2 disabled:opacity-60 ${
                    validation.min_order_total
                      ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30"
                      : "border-gray-700 focus:border-brand-gold focus:ring-brand-gold/40"
                  }`}
                />
                {validation.min_order_total && (
                  <p className="text-[11px] text-red-400 mt-1">
                    {validation.min_order_total}
                  </p>
                )}
              </Field>
            </div>

            {form.discount_type === "percent" && (
              <Field
                label="Max Discount (GH₵)"
                htmlFor="max_discount"
                hint="Leave blank for no cap."
              >
                <input
                  id="max_discount"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  disabled={saving}
                  value={form.max_discount}
                  onChange={(e) =>
                    setForm({ ...form, max_discount: e.target.value })
                  }
                  aria-invalid={!!validation.max_discount}
                  className={`w-full px-4 py-3 rounded-xl bg-brand-dark border text-white text-sm outline-none transition-colors focus:ring-2 disabled:opacity-60 ${
                    validation.max_discount
                      ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30"
                      : "border-gray-700 focus:border-brand-gold focus:ring-brand-gold/40"
                  }`}
                />
                {validation.max_discount && (
                  <p className="text-[11px] text-red-400 mt-1">
                    {validation.max_discount}
                  </p>
                )}
              </Field>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Total Usage Limit"
                htmlFor="usage_limit"
                hint="Blank = unlimited."
              >
                <input
                  id="usage_limit"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  disabled={saving}
                  value={form.usage_limit}
                  onChange={(e) =>
                    setForm({ ...form, usage_limit: e.target.value })
                  }
                  aria-invalid={!!validation.usage_limit}
                  className={`w-full px-4 py-3 rounded-xl bg-brand-dark border text-white text-sm outline-none transition-colors focus:ring-2 disabled:opacity-60 ${
                    validation.usage_limit
                      ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30"
                      : "border-gray-700 focus:border-brand-gold focus:ring-brand-gold/40"
                  }`}
                />
                {validation.usage_limit && (
                  <p className="text-[11px] text-red-400 mt-1">
                    {validation.usage_limit}
                  </p>
                )}
              </Field>
              <Field label="Per-Customer Limit" htmlFor="per_customer_limit">
                <input
                  id="per_customer_limit"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  disabled={saving}
                  value={form.per_customer_limit}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      per_customer_limit: e.target.value,
                    })
                  }
                  aria-invalid={!!validation.per_customer_limit}
                  className={`w-full px-4 py-3 rounded-xl bg-brand-dark border text-white text-sm outline-none transition-colors focus:ring-2 disabled:opacity-60 ${
                    validation.per_customer_limit
                      ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30"
                      : "border-gray-700 focus:border-brand-gold focus:ring-brand-gold/40"
                  }`}
                />
                {validation.per_customer_limit && (
                  <p className="text-[11px] text-red-400 mt-1">
                    {validation.per_customer_limit}
                  </p>
                )}
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Valid From" htmlFor="valid_from">
                <input
                  id="valid_from"
                  type="datetime-local"
                  disabled={saving}
                  value={form.valid_from}
                  onChange={(e) =>
                    setForm({ ...form, valid_from: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none transition-colors disabled:opacity-60"
                />
              </Field>
              <Field label="Valid Until" htmlFor="valid_until">
                <input
                  id="valid_until"
                  type="datetime-local"
                  disabled={saving}
                  value={form.valid_until}
                  onChange={(e) =>
                    setForm({ ...form, valid_until: e.target.value })
                  }
                  aria-invalid={!!validation.valid_until}
                  className={`w-full px-4 py-3 rounded-xl bg-brand-dark border text-white text-sm outline-none transition-colors focus:ring-2 disabled:opacity-60 ${
                    validation.valid_until
                      ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30"
                      : "border-gray-700 focus:border-brand-gold focus:ring-brand-gold/40"
                  }`}
                />
                {validation.valid_until && (
                  <p className="text-[11px] text-red-400 mt-1">
                    {validation.valid_until}
                  </p>
                )}
              </Field>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                disabled={saving}
                checked={form.is_active}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
                className="accent-brand-gold"
              />
              Active (customers can use this code)
            </label>

            <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-4 bg-brand-card border-t border-gray-700 flex gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white font-bold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !formValid}
                className="flex-1 py-3 rounded-xl bg-brand-gold hover:bg-brand-amber disabled:opacity-50 disabled:cursor-not-allowed text-brand-dark font-extrabold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/60"
              >
                {saving
                  ? "Saving…"
                  : editing
                  ? "Save Changes"
                  : "Create Promo"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          onClose={() => (deleting ? null : setDeleteTarget(null))}
          labelledBy="delete-promo-title"
          disableClose={deleting}
        >
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <h3
                id="delete-promo-title"
                className="font-heading text-lg font-bold text-white"
              >
                Delete promo code?
              </h3>
            </div>
            <p className="text-sm text-gray-400">
              You're about to delete{" "}
              <span className="font-mono text-white font-bold">
                {deleteTarget.code}
              </span>
              .
            </p>
            {safeNumber(deleteTarget.times_used) > 0 && (
              <p className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
                This code has been used{" "}
                <strong>{safeNumber(deleteTarget.times_used)}</strong> times.
                Past orders keep their discount history.
              </p>
            )}
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

      <Toast toast={toast} />
    </div>
  );
}

function Row({ label, value, valueClass = "text-white" }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-400">{label}:</span>
      <span className={`font-bold ${valueClass} text-right`}>{value}</span>
    </div>
  );
}