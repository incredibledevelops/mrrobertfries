"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Phone,
  Mail,
  Clock,
  Building2,
  Globe,
  Check,
  X,
  AlertCircle,
  Power,
  PowerOff,
  RefreshCw,
} from "lucide-react";
import { API_URL } from "@/lib/api";
import { SkeletonBlock, SkeletonLine } from "@/components/Skeleton";

const TOKEN_KEY = "mrf_token";
const TOKEN_ISSUED_AT_KEY = "mrf_token_issued_at";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const GHANA_REGIONS = [
  "Greater Accra",
  "Ashanti",
  "Western",
  "Western North",
  "Central",
  "Eastern",
  "Volta",
  "Oti",
  "Northern",
  "Savannah",
  "North East",
  "Upper East",
  "Upper West",
  "Bono",
  "Bono East",
  "Ahafo",
];

const HOURS_PRESETS = ["11:00-23:00", "10:00-22:00", "12:00-00:00", "24/7"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s()]{7,20}$/;

const EMPTY_FORM = {
  name: "",
  description: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  region: "",
  opening_hours: "11:00-23:00",
  is_active: true,
  is_default: false,
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

function BranchGridSkeleton({ count = 4 }) {
  return (
    <div
      role="status"
      aria-label="Loading branches"
      className="grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-brand-card border border-gray-700 rounded-2xl p-5 space-y-3"
        >
          <div className="flex items-center gap-2">
            <SkeletonLine className="h-4 w-32" />
            <SkeletonLine className="h-4 w-16 rounded" />
          </div>
          <SkeletonLine className="h-3 w-3/4" />
          <div className="flex gap-2">
            <SkeletonBlock className="h-6 w-20 rounded-lg" />
            <SkeletonBlock className="h-6 w-24 rounded-lg" />
          </div>
          <div className="space-y-1.5 pt-2">
            <SkeletonLine className="h-3 w-1/2" />
            <SkeletonLine className="h-3 w-2/3" />
          </div>
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

export default function AdminBranches() {
  const router = useRouter();

  const [token, setToken] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

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
      const res = await authFetch(`${API_URL}/api/v1/branches/with-zone-counts`);
      if (res.ok) {
        const data = await readJson(res);
        setBranches(Array.isArray(data) ? data : []);
      } else if (res.status === 404) {
        const fallback = await authFetch(`${API_URL}/api/v1/branches`);
        if (!fallback.ok) throw new Error("Couldn't load branches.");
        const data = await readJson(fallback);
        setBranches(Array.isArray(data) ? data : []);
      } else {
        throw new Error("Couldn't load branches.");
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

  const openCreate = useCallback(() => {
    setForm({
      ...EMPTY_FORM,
      is_default: branches.length === 0,
      is_active: true,
    });
    setEditing(null);
    setFormError("");
    setShowForm(true);
  }, [branches.length]);

  const openEdit = useCallback((b) => {
    setForm({
      name: b.name || "",
      description: b.description || "",
      phone: b.phone || "",
      email: b.email || "",
      address: b.address || "",
      city: b.city || "",
      region: b.region || "",
      opening_hours: b.opening_hours || "11:00-23:00",
      is_active: !!b.is_active,
      is_default: !!b.is_default,
      display_order: b.display_order ?? 0,
    });
    setEditing(b);
    setFormError("");
    setShowForm(true);
  }, []);

  const formValidation = useMemo(() => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Name is required.";
    if (form.email && !EMAIL_RE.test(form.email.trim()))
      errs.email = "Enter a valid email address.";
    if (form.phone && !PHONE_RE.test(form.phone.trim()))
      errs.phone = "Enter a valid phone number.";
    if (
      form.display_order !== "" &&
      !Number.isFinite(Number(form.display_order))
    )
      errs.display_order = "Must be a number.";
    return errs;
  }, [form]);

  const formValid = Object.keys(formValidation).length === 0;

  const handleSave = useCallback(
    async (e) => {
      e.preventDefault();
      if (!formValid) {
        setFormError("Please fix the highlighted fields.");
        return;
      }
      const payload = {
        name: form.name.trim(),
        description: form.description?.trim() || null,
        phone: form.phone?.trim() || null,
        email: form.email?.trim() || null,
        address: form.address?.trim() || null,
        city: form.city?.trim() || null,
        region: form.region?.trim() || null,
        opening_hours: form.opening_hours?.trim() || null,
        is_active: !!form.is_active,
        is_default: !!form.is_default,
        display_order: safeNumber(form.display_order, 0),
      };

      const url = editing
        ? `${API_URL}/api/v1/branches/${editing.id}`
        : `${API_URL}/api/v1/branches`;
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
        showToast(editing ? "Branch updated." : "Branch created.");
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
    const b = deleteTarget;
    setDeleting(true);
    setBusyIds((s) => new Set(s).add(b.id));
    try {
      const res = await authFetch(`${API_URL}/api/v1/branches/${b.id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        const err = await readJson(res);
        throw new Error(err.detail || "Delete failed.");
      }
      setBranches((prev) => prev.filter((x) => x.id !== b.id));
      showToast("Branch deleted.");
      setDeleteTarget(null);
    } catch (err) {
      showToast(err.message || "Delete failed.", "error");
    } finally {
      setDeleting(false);
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(b.id);
        return next;
      });
    }
  }, [deleteTarget, authFetch, showToast]);

  const toggleActive = useCallback(
    async (b) => {
      if (busyIds.has(b.id)) return;
      const prev = branches;
      const next = !b.is_active;

      setBranches((list) =>
        list.map((x) => (x.id === b.id ? { ...x, is_active: next } : x))
      );
      setBusyIds((s) => new Set(s).add(b.id));

      try {
        const res = await authFetch(`${API_URL}/api/v1/branches/${b.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: next }),
        });
        if (!res.ok) {
          const err = await readJson(res);
          throw new Error(err.detail || "Toggle failed.");
        }
        showToast(next ? "Branch activated." : "Branch deactivated.");
      } catch (err) {
        setBranches(prev);
        showToast(err.message || "Toggle failed.", "error");
      } finally {
        setBusyIds((s) => {
          const out = new Set(s);
          out.delete(b.id);
          return out;
        });
      }
    },
    [branches, busyIds, authFetch, showToast]
  );

  if (!authChecked || !token) {
    return (
      <div>
        <div className="h-8 w-40 rounded bg-gray-700/40 animate-pulse mb-6" />
        <BranchGridSkeleton />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-white">
            Branches
          </h1>
          <p className="text-gray-400 text-sm mt-1 max-w-2xl">
            Multiple kitchens across Ghana. Zones, menu items, staff, and
            orders can be scoped to a branch.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-extrabold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/60"
        >
          <Plus className="w-4 h-4" />
          New Branch
        </button>
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
        <BranchGridSkeleton count={4} />
      ) : branches.length === 0 ? (
        <div className="bg-brand-card border border-gray-700 rounded-2xl p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h2 className="font-bold text-white text-lg">No branches yet</h2>
          <p className="text-gray-400 text-sm mt-1 max-w-sm mx-auto">
            Create your first branch to start accepting orders.
          </p>
          <button
            onClick={openCreate}
            className="mt-5 px-5 py-2.5 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-bold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/60"
          >
            Create your first branch
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {branches.map((b) => {
            const busy = busyIds.has(b.id);
            const zoneCount = safeNumber(b.zone_count);
            const sharedCount = safeNumber(b.shared_zone_count);
            return (
              <article
                key={b.id}
                aria-busy={busy}
                className={`bg-brand-card border border-gray-700 rounded-2xl p-5 transition-all hover:border-gray-600 ${
                  !b.is_active ? "opacity-70" : ""
                } ${busy ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between mb-3 gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-white truncate">
                        {b.name}
                      </h3>
                      {b.is_default && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-brand-gold/20 text-brand-gold font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          DEFAULT
                        </span>
                      )}
                      {!b.is_active && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">
                          INACTIVE
                        </span>
                      )}
                    </div>
                    {b.description && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {b.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="text-[11px] px-2 py-1 rounded-lg bg-brand-gold/10 text-brand-gold font-bold border border-brand-gold/30 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {zoneCount} zone{zoneCount === 1 ? "" : "s"}
                  </span>
                  {sharedCount > 0 && (
                    <span className="text-[11px] px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 font-bold border border-blue-500/30 flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {sharedCount} shared
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-xs text-gray-300 mb-3">
                  {b.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-500" />
                      {b.phone}
                    </div>
                  )}
                  {b.email && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-gray-500" />
                      {b.email}
                    </div>
                  )}
                  {b.address && (
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-gray-500" />
                      {b.address}
                      {b.city && `, ${b.city}`}
                    </div>
                  )}
                  {b.opening_hours && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-500" />
                      {b.opening_hours}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-3 border-t border-gray-800">
                  <button
                    onClick={() => openEdit(b)}
                    disabled={busy}
                    className="flex-1 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-600 flex items-center justify-center gap-1.5"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => toggleActive(b)}
                    disabled={busy}
                    className="flex-1 py-2 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 disabled:opacity-50 text-amber-400 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/40 flex items-center justify-center gap-1.5"
                  >
                    {busy ? (
                      "…"
                    ) : b.is_active ? (
                      <>
                        <PowerOff className="w-3.5 h-3.5" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <Power className="w-3.5 h-3.5" />
                        Activate
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(b)}
                    disabled={b.is_default || busy}
                    title={
                      b.is_default
                        ? "Cannot delete the default branch"
                        : "Delete branch"
                    }
                    aria-label={`Delete ${b.name}`}
                    className="px-3 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 disabled:opacity-40 disabled:cursor-not-allowed text-red-400 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40"
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
          labelledBy="branch-form-title"
          disableClose={saving}
        >
          <form
            onSubmit={handleSave}
            aria-busy={saving}
            className="p-6 space-y-4"
          >
            <div className="flex justify-between items-center pb-4 border-b border-gray-700">
              <h3
                id="branch-form-title"
                className="font-heading text-lg font-bold text-white"
              >
                {editing ? "Edit Branch" : "New Branch"}
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

            <Field label="Name" htmlFor="name">
              <input
                id="name"
                required
                autoFocus
                disabled={saving}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Takoradi Hub"
                aria-invalid={!!formValidation.name}
                className={`w-full px-4 py-3 rounded-xl bg-brand-dark border text-white text-sm outline-none transition-colors focus:ring-2 disabled:opacity-60 ${
                  formValidation.name
                    ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30"
                    : "border-gray-700 focus:border-brand-gold focus:ring-brand-gold/40"
                }`}
              />
              {formValidation.name && (
                <p className="text-[11px] text-red-400 mt-1">
                  {formValidation.name}
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
                placeholder="Short summary"
                className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none transition-colors disabled:opacity-60"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Phone" htmlFor="phone">
                <input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  disabled={saving}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="0599233488"
                  aria-invalid={!!formValidation.phone}
                  className={`w-full px-4 py-3 rounded-xl bg-brand-dark border text-white text-sm outline-none transition-colors focus:ring-2 disabled:opacity-60 ${
                    formValidation.phone
                      ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30"
                      : "border-gray-700 focus:border-brand-gold focus:ring-brand-gold/40"
                  }`}
                />
                {formValidation.phone && (
                  <p className="text-[11px] text-red-400 mt-1">
                    {formValidation.phone}
                  </p>
                )}
              </Field>
              <Field label="Email" htmlFor="email">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  disabled={saving}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  aria-invalid={!!formValidation.email}
                  className={`w-full px-4 py-3 rounded-xl bg-brand-dark border text-white text-sm outline-none transition-colors focus:ring-2 disabled:opacity-60 ${
                    formValidation.email
                      ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30"
                      : "border-gray-700 focus:border-brand-gold focus:ring-brand-gold/40"
                  }`}
                />
                {formValidation.email && (
                  <p className="text-[11px] text-red-400 mt-1">
                    {formValidation.email}
                  </p>
                )}
              </Field>
            </div>

            <Field label="Address" htmlFor="address">
              <input
                id="address"
                autoComplete="street-address"
                disabled={saving}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Street / landmark"
                className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none transition-colors disabled:opacity-60"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="City" htmlFor="city">
                <input
                  id="city"
                  autoComplete="address-level2"
                  disabled={saving}
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Accra"
                  className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none transition-colors disabled:opacity-60"
                />
              </Field>
              <Field label="Region" htmlFor="region">
                <input
                  id="region"
                  list="ghana-regions"
                  autoComplete="address-level1"
                  disabled={saving}
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                  placeholder="Greater Accra"
                  className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none transition-colors disabled:opacity-60"
                />
                <datalist id="ghana-regions">
                  {GHANA_REGIONS.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </Field>
            </div>

            <Field label="Opening Hours" htmlFor="opening_hours">
              <input
                id="opening_hours"
                disabled={saving}
                value={form.opening_hours}
                onChange={(e) =>
                  setForm({ ...form, opening_hours: e.target.value })
                }
                placeholder="11:00-23:00"
                className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none transition-colors disabled:opacity-60"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {HOURS_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    disabled={saving}
                    onClick={() => setForm({ ...form, opening_hours: p })}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-50 ${
                      form.opening_hours === p
                        ? "bg-brand-gold text-brand-dark"
                        : "bg-brand-dark border border-gray-700 text-gray-300 hover:text-white"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </Field>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  disabled={saving}
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm({ ...form, is_active: e.target.checked })
                  }
                  className="accent-brand-gold"
                />
                Active
              </label>
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
                Default branch
              </label>
            </div>
            {form.is_default && editing && !editing.is_default && (
              <p className="text-[11px] text-amber-400">
                Making this default will unset the current default branch.
              </p>
            )}

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
                aria-invalid={!!formValidation.display_order}
                className={`w-full px-4 py-3 rounded-xl bg-brand-dark border text-white text-sm outline-none transition-colors focus:ring-2 disabled:opacity-60 ${
                  formValidation.display_order
                    ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30"
                    : "border-gray-700 focus:border-brand-gold focus:ring-brand-gold/40"
                }`}
              />
              {formValidation.display_order && (
                <p className="text-[11px] text-red-400 mt-1">
                  {formValidation.display_order}
                </p>
              )}
            </Field>

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
                  : "Create Branch"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          onClose={() => (deleting ? null : setDeleteTarget(null))}
          labelledBy="delete-branch-title"
          disableClose={deleting}
        >
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <h3
                id="delete-branch-title"
                className="font-heading text-lg font-bold text-white"
              >
                Delete branch?
              </h3>
            </div>
            <p className="text-sm text-gray-400">
              You're about to delete{" "}
              <span className="text-white font-bold">
                {deleteTarget.name}
              </span>
              . This can't be undone.
            </p>
            <p className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
              Any orders, zones, or menu items scoped to this branch may be
              affected.
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