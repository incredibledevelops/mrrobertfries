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
  ChefHat,
  UtensilsCrossed,
  Drumstick,
  Soup,
  Pizza,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import { API_URL } from "@/lib/api";
import { SkeletonBlock, SkeletonLine } from "@/components/Skeleton";

const TOKEN_KEY = "mrf_token";
const TOKEN_ISSUED_AT_KEY = "mrf_token_issued_at";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const TYPES = ["base", "protein", "sauce", "topping"];
const TYPE_LABELS = {
  base: "Base",
  protein: "Protein",
  sauce: "Sauce",
  topping: "Topping",
};
const TYPE_ICONS = {
  base: UtensilsCrossed,
  protein: Drumstick,
  sauce: Soup,
  topping: Pizza,
};
const TYPE_PLURAL = {
  base: "Bases",
  protein: "Proteins",
  sauce: "Sauces",
  topping: "Toppings",
};

const EMPTY_FORM = {
  type: "base",
  name: "",
  description: "",
  price: 0,
  is_default: false,
  is_available: true,
  display_order: 0,
};

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

function formatPrice(price) {
  const n = safeNumber(price);
  if (n <= 0) return "Free";
  return `+ ${formatGHS(n)}`;
}

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

function BuilderSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading builder options"
      className="space-y-8"
    >
      {[1, 2].map((g) => (
        <div key={g}>
          <SkeletonLine className="h-5 w-32 mb-3" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-4 bg-brand-card border border-gray-700 rounded-2xl space-y-3"
              >
                <div className="flex justify-between">
                  <SkeletonLine className="h-4 w-24" />
                  <SkeletonBlock className="h-6 w-16 rounded-lg" />
                </div>
                <SkeletonLine className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminBuilder() {
  const router = useRouter();

  const [token, setToken] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

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
      const res = await authFetch(`${API_URL}/api/v1/builder/options`);
      if (!res.ok) throw new Error("Couldn't load builder options.");
      const data = await readJson(res);
      setOptions(Array.isArray(data) ? data : []);
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

  const openCreate = useCallback(
    (type = "base") => {
      setForm({
        ...EMPTY_FORM,
        type,
        display_order: options.filter((o) => o.type === type).length,
      });
      setEditing(null);
      setFormError("");
      setShowForm(true);
    },
    [options]
  );

  const openEdit = useCallback((opt) => {
    setForm({
      type: opt.type,
      name: opt.name || "",
      description: opt.description || "",
      price: opt.price ?? 0,
      is_default: !!opt.is_default,
      is_available: !!opt.is_available,
      display_order: opt.display_order ?? 0,
    });
    setEditing(opt);
    setFormError("");
    setShowForm(true);
  }, []);

  const formValidation = useMemo(() => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Name is required.";
    if (
      form.price !== "" &&
      (!Number.isFinite(Number(form.price)) || Number(form.price) < 0)
    )
      errs.price = "Price must be 0 or higher.";
    if (
      form.display_order !== "" &&
      !Number.isFinite(Number(form.display_order))
    )
      errs.display_order = "Must be a number.";

    let defaultConflict = null;
    if (form.is_default) {
      const otherDefault = options.find(
        (o) =>
          o.type === form.type &&
          o.is_default &&
          (!editing || o.id !== editing.id)
      );
      if (otherDefault) {
        defaultConflict = otherDefault.name;
      }
    }

    return { errs, defaultConflict };
  }, [form, options, editing]);

  const formValid = Object.keys(formValidation.errs).length === 0;

  const handleSave = useCallback(
    async (e) => {
      e.preventDefault();
      if (!formValid) {
        setFormError("Please fix the highlighted fields.");
        return;
      }
      const payload = {
        type: form.type,
        name: form.name.trim(),
        description: form.description?.trim() || null,
        price: safeNumber(form.price, 0),
        is_default: !!form.is_default,
        is_available: !!form.is_available,
        display_order: safeNumber(form.display_order, 0),
      };

      const url = editing
        ? `${API_URL}/api/v1/builder/options/${editing.id}`
        : `${API_URL}/api/v1/builder/options`;
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
        showToast(editing ? "Option updated." : "Option created.");
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
    const opt = deleteTarget;
    setDeleting(true);
    setBusyIds((s) => new Set(s).add(opt.id));
    try {
      const res = await authFetch(
        `${API_URL}/api/v1/builder/options/${opt.id}`,
        { method: "DELETE" }
      );
      if (!res.ok && res.status !== 204) {
        const err = await readJson(res);
        throw new Error(err.detail || "Delete failed.");
      }
      setOptions((prev) => prev.filter((o) => o.id !== opt.id));
      showToast("Option deleted.");
      setDeleteTarget(null);
    } catch (err) {
      showToast(err.message || "Delete failed.", "error");
    } finally {
      setDeleting(false);
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(opt.id);
        return next;
      });
    }
  }, [deleteTarget, authFetch, showToast]);

  const filteredOptions = useMemo(() => {
    let list = options;
    if (typeFilter !== "all") list = list.filter((o) => o.type === typeFilter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (o) =>
          o.name?.toLowerCase().includes(q) ||
          o.description?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [options, typeFilter, query]);

  const grouped = useMemo(() => {
    const acc = { base: [], protein: [], sauce: [], topping: [] };
    for (const o of filteredOptions) {
      if (acc[o.type]) acc[o.type].push(o);
    }
    for (const k of Object.keys(acc)) {
      acc[k].sort((a, b) => {
        const d = safeNumber(a.display_order) - safeNumber(b.display_order);
        if (d !== 0) return d;
        return String(a.name).localeCompare(String(b.name));
      });
    }
    return acc;
  }, [filteredOptions]);

  const totals = useMemo(
    () => ({
      total: options.length,
      byType: TYPES.reduce((acc, t) => {
        acc[t] = options.filter((o) => o.type === t).length;
        return acc;
      }, {}),
    }),
    [options]
  );

  const hasAnyResults = TYPES.some((t) => grouped[t].length > 0);

  if (!authChecked || !token) {
    return (
      <div>
        <div className="h-8 w-48 rounded bg-gray-700/40 animate-pulse mb-6" />
        <BuilderSkeleton />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-white">
            Builder Options
          </h1>
          <p className="text-gray-400 text-sm mt-1 max-w-2xl">
            Bases, proteins, sauces and toppings customers can choose when
            building a custom bowl.
          </p>
        </div>
        <button
          onClick={() => openCreate("base")}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-extrabold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/60"
        >
          <Plus className="w-4 h-4" />
          New Option
        </button>
      </div>

      {!loading && options.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="text-xs text-gray-400 flex flex-wrap items-center gap-2">
            <span className="text-white font-bold">{totals.total}</span>
            <span>option{totals.total === 1 ? "" : "s"} total</span>
            <span className="text-gray-600">·</span>
            {TYPES.map((t, i) => {
              const Icon = TYPE_ICONS[t];
              return (
                <span key={t} className="flex items-center gap-1">
                  <Icon className="w-3.5 h-3.5" />
                  {totals.byType[t]} {TYPE_PLURAL[t].toLowerCase()}
                  {i < TYPES.length - 1 && (
                    <span className="text-gray-600 ml-1">,</span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search options…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-brand-card border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none transition-colors"
          />
        </div>
        <div
          role="tablist"
          aria-label="Filter by type"
          className="flex gap-1 bg-brand-card border border-gray-700 rounded-xl p-1 overflow-x-auto no-scrollbar"
        >
          <button
            role="tab"
            aria-selected={typeFilter === "all"}
            onClick={() => setTypeFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/40 ${
              typeFilter === "all"
                ? "bg-brand-gold text-brand-dark"
                : "text-gray-400 hover:text-white"
            }`}
          >
            All
          </button>
          {TYPES.map((t) => {
            const Icon = TYPE_ICONS[t];
            return (
              <button
                key={t}
                role="tab"
                aria-selected={typeFilter === t}
                onClick={() => setTypeFilter(t)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/40 ${
                  typeFilter === t
                    ? "bg-brand-gold text-brand-dark"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {TYPE_LABELS[t]}s
              </button>
            );
          })}
        </div>
      </div>

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
        <BuilderSkeleton />
      ) : options.length === 0 ? (
        <div className="bg-brand-card border border-gray-700 rounded-2xl p-12 text-center">
          <ChefHat className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h2 className="font-bold text-white text-lg">
            No builder options yet
          </h2>
          <p className="text-gray-400 text-sm mt-1 max-w-md mx-auto">
            Add bases, proteins, sauces, and toppings so customers can build
            their perfect bowl.
          </p>
          <button
            onClick={() => openCreate("base")}
            className="mt-5 px-5 py-2.5 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-bold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/60"
          >
            Add your first option
          </button>
        </div>
      ) : !hasAnyResults ? (
        <div className="bg-brand-card border border-gray-700 rounded-2xl p-10 text-center">
          <p className="text-gray-400 text-sm">
            No options match your filters.
          </p>
          <button
            onClick={() => {
              setQuery("");
              setTypeFilter("all");
            }}
            className="mt-3 text-brand-gold text-xs font-bold underline hover:no-underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          {TYPES.map((type) => {
            const items = grouped[type];
            const TypeIcon = TYPE_ICONS[type];
            if (typeFilter !== "all" && typeFilter !== type) return null;
            if (items.length === 0 && (query || typeFilter !== "all")) {
              return null;
            }
            return (
              <section key={type}>
                <div className="flex items-center justify-between mb-3 gap-3">
                  <h2 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                    <TypeIcon className="w-5 h-5 text-brand-gold" />
                    {TYPE_PLURAL[type]}
                    <span className="text-xs text-gray-500 font-normal">
                      ({items.length})
                    </span>
                  </h2>
                  <button
                    onClick={() => openCreate(type)}
                    className="flex items-center gap-1 text-xs text-brand-gold font-bold hover:underline focus:outline-none focus:ring-2 focus:ring-brand-gold/40 rounded px-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add {TYPE_LABELS[type]}
                  </button>
                </div>

                {items.length === 0 ? (
                  <div className="bg-brand-card border border-dashed border-gray-700 rounded-2xl p-6 text-center">
                    <p className="text-gray-500 text-xs">
                      No {TYPE_LABELS[type].toLowerCase()}s yet.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {items.map((opt) => {
                      const busy = busyIds.has(opt.id);
                      return (
                        <article
                          key={opt.id}
                          aria-busy={busy}
                          className={`p-4 bg-brand-card border border-gray-700 rounded-2xl flex items-start justify-between gap-3 transition-all hover:border-gray-600 ${
                            !opt.is_available ? "opacity-70" : ""
                          } ${busy ? "opacity-60" : ""}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-white truncate">
                                {opt.name}
                              </h3>
                              {opt.is_default && (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-brand-gold/20 text-brand-gold font-bold flex items-center gap-0.5">
                                  <Check className="w-3 h-3" />
                                  DEFAULT
                                </span>
                              )}
                              {!opt.is_available && (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold flex items-center gap-0.5">
                                  <EyeOff className="w-3 h-3" />
                                  HIDDEN
                                </span>
                              )}
                            </div>
                            {opt.description && (
                              <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">
                                {opt.description}
                              </p>
                            )}
                            <div className="text-brand-gold text-sm font-bold mt-1.5">
                              {formatPrice(opt.price)}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <button
                              onClick={() => openEdit(opt)}
                              disabled={busy}
                              className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-600 flex items-center gap-1"
                            >
                              <Pencil className="w-3 h-3" />
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteTarget(opt)}
                              disabled={busy}
                              aria-label={`Delete ${opt.name}`}
                              className="px-2 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 disabled:opacity-50 text-red-400 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40 flex items-center justify-center"
                            >
                              {busy ? "…" : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {showForm && (
        <Modal
          onClose={() => setShowForm(false)}
          labelledBy="option-form-title"
          disableClose={saving}
        >
          <form onSubmit={handleSave} aria-busy={saving} className="p-6 space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-gray-700">
              <h3
                id="option-form-title"
                className="font-heading text-lg font-bold text-white"
              >
                {editing ? "Edit Option" : "New Builder Option"}
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

            <Field label="Type" htmlFor="type">
              <div
                role="radiogroup"
                aria-label="Option type"
                className="grid grid-cols-2 sm:grid-cols-4 gap-2"
              >
                {TYPES.map((t) => {
                  const Icon = TYPE_ICONS[t];
                  return (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={form.type === t}
                      disabled={saving}
                      onClick={() => setForm((f) => ({ ...f, type: t }))}
                      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/50 disabled:opacity-50 ${
                        form.type === t
                          ? "bg-brand-gold text-brand-dark"
                          : "bg-brand-dark border border-gray-700 text-gray-300 hover:text-white"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {TYPE_LABELS[t]}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Name" htmlFor="name">
              <input
                id="name"
                required
                autoFocus
                disabled={saving}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={`e.g. ${
                  form.type === "base"
                    ? "Regular Fries"
                    : form.type === "protein"
                    ? "Grilled Chicken"
                    : form.type === "sauce"
                    ? "Shito Aioli"
                    : "Extra Cheddar"
                }`}
                aria-invalid={!!formValidation.errs.name}
                className={`w-full px-4 py-3 rounded-xl bg-brand-dark border text-white text-sm outline-none transition-colors focus:ring-2 disabled:opacity-60 ${
                  formValidation.errs.name
                    ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30"
                    : "border-gray-700 focus:border-brand-gold focus:ring-brand-gold/40"
                }`}
              />
              {formValidation.errs.name && (
                <p className="text-[11px] text-red-400 mt-1">
                  {formValidation.errs.name}
                </p>
              )}
            </Field>

            <Field
              label="Description (optional)"
              htmlFor="description"
              hint="Shown to customers on the builder page."
            >
              <input
                id="description"
                disabled={saving}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Short description"
                className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none transition-colors disabled:opacity-60"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Price (GH₵)" htmlFor="price">
                <input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  disabled={saving}
                  value={form.price}
                  onChange={(e) =>
                    setForm({ ...form, price: e.target.value })
                  }
                  aria-invalid={!!formValidation.errs.price}
                  className={`w-full px-4 py-3 rounded-xl bg-brand-dark border text-white text-sm outline-none transition-colors focus:ring-2 disabled:opacity-60 ${
                    formValidation.errs.price
                      ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30"
                      : "border-gray-700 focus:border-brand-gold focus:ring-brand-gold/40"
                  }`}
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Set to 0 for a free option.
                </p>
                {formValidation.errs.price && (
                  <p className="text-[11px] text-red-400 mt-1">
                    {formValidation.errs.price}
                  </p>
                )}
              </Field>
              <Field label="Display Order" htmlFor="display_order">
                <input
                  id="display_order"
                  type="number"
                  inputMode="numeric"
                  disabled={saving}
                  value={form.display_order}
                  onChange={(e) =>
                    setForm({ ...form, display_order: e.target.value })
                  }
                  aria-invalid={!!formValidation.errs.display_order}
                  className={`w-full px-4 py-3 rounded-xl bg-brand-dark border text-white text-sm outline-none transition-colors focus:ring-2 disabled:opacity-60 ${
                    formValidation.errs.display_order
                      ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30"
                      : "border-gray-700 focus:border-brand-gold focus:ring-brand-gold/40"
                  }`}
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Lower numbers appear first.
                </p>
                {formValidation.errs.display_order && (
                  <p className="text-[11px] text-red-400 mt-1">
                    {formValidation.errs.display_order}
                  </p>
                )}
              </Field>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  disabled={saving}
                  checked={form.is_default}
                  onChange={(e) =>
                    setForm({ ...form, is_default: e.target.checked })
                  }
                  className="accent-brand-gold"
                />
                Default selection
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  disabled={saving}
                  checked={form.is_available}
                  onChange={(e) =>
                    setForm({ ...form, is_available: e.target.checked })
                  }
                  className="accent-brand-gold"
                />
                Visible to customers
              </label>
            </div>

            {formValidation.defaultConflict && form.is_default && (
              <p className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  Heads up: <strong>{formValidation.defaultConflict}</strong>{" "}
                  is currently the default{" "}
                  {TYPE_LABELS[form.type].toLowerCase()}. Saving will replace it.
                </span>
              </p>
            )}

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
                {saving ? "Saving…" : editing ? "Save Changes" : "Create Option"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          onClose={() => (deleting ? null : setDeleteTarget(null))}
          labelledBy="delete-option-title"
          disableClose={deleting}
        >
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <h3
                id="delete-option-title"
                className="font-heading text-lg font-bold text-white"
              >
                Delete option?
              </h3>
            </div>
            <p className="text-sm text-gray-400">
              You're about to delete{" "}
              <span className="text-white font-bold">
                {deleteTarget.name}
              </span>{" "}
              ({TYPE_LABELS[deleteTarget.type]}).
            </p>
            <p className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
              Any orders that included this option will keep their history, but
              it will no longer be selectable.
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

      <Toast toast={toast} />
    </div>
  );
}