"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Building2,
  Globe,
  AlertTriangle,
  RefreshCw,
  X,
  Check,
  DollarSign,
  Clock,
  Search,
  Link2,
  AlertCircle,
} from "lucide-react";
import { API_URL } from "@/lib/api";
import { SkeletonBlock, SkeletonLine } from "@/components/Skeleton";

const TOKEN_KEY = "mrf_token";
const TOKEN_ISSUED_AT_KEY = "mrf_token_issued_at";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

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

function Toast({ toast }) {
  if (!toast) return null;
  const isError = toast.type === "error";
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-xl border text-sm font-semibold shadow-lg backdrop-blur flex items-center gap-2 ${
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

function ZonesSkeleton({ count = 6 }) {
  return (
    <div
      role="status"
      aria-label="Loading zones"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-5 bg-brand-card border border-gray-700 rounded-2xl space-y-3"
        >
          <div className="flex justify-between">
            <SkeletonLine className="h-5 w-32" />
            <SkeletonBlock className="h-5 w-16 rounded" />
          </div>
          <SkeletonLine className="h-3 w-24" />
          <div className="space-y-2 pt-2">
            <SkeletonLine className="h-3 w-full" />
            <SkeletonLine className="h-3 w-2/3" />
          </div>
          <div className="flex gap-2 pt-3">
            <SkeletonBlock className="h-8 flex-1 rounded-lg" />
            <SkeletonBlock className="h-8 w-10 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminZones() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [zones, setZones] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterBranch, setFilterBranch] = useState("all");
  const [orphanCount, setOrphanCount] = useState(0);
  const [fixing, setFixing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
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

  const [form, setForm] = useState({
    name: "",
    description: "",
    delivery_fee: 15,
    estimated_minutes: 30,
    branch_id: "",
    is_active: true,
    display_order: 0,
  });

  useEffect(() => {
    const t = getAdminToken();
    if (!t) {
      router.replace("/admin");
      return;
    }
    setToken(t);
    setAuthChecked(true);
    loadAll(t);
  }, [router]);

  async function loadAll(t) {
    setLoading(true);
    setError("");
    try {
      const [zonesRes, branchesRes, orphanRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/delivery-zones`, {
          headers: { Authorization: `Bearer ${t}` },
        }),
        fetch(`${API_URL}/api/v1/branches`, {
          headers: { Authorization: `Bearer ${t}` },
        }),
        fetch(`${API_URL}/api/v1/delivery-zones/orphans/count`, {
          headers: { Authorization: `Bearer ${t}` },
        }),
      ]);
      setZones(await zonesRes.json());
      const branchList = await branchesRes.json();
      setBranches(branchList);
      const orphan = await orphanRes.json();
      setOrphanCount(orphan.count || 0);

      const defaultBranch = branchList.find((b) => b.is_default) || branchList[0];
      if (defaultBranch && !form.branch_id) {
        setForm((f) => ({ ...f, branch_id: defaultBranch.id }));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    const defaultBranch = branches.find((b) => b.is_default) || branches[0];
    setForm({
      name: "",
      description: "",
      delivery_fee: 15,
      estimated_minutes: 30,
      branch_id: defaultBranch?.id || "",
      is_active: true,
      display_order: 0,
    });
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(zone) {
    setForm({
      name: zone.name,
      description: zone.description || "",
      delivery_fee: zone.delivery_fee,
      estimated_minutes: zone.estimated_minutes || 30,
      branch_id: zone.branch_id || "",
      is_active: zone.is_active,
      display_order: zone.display_order,
    });
    setEditing(zone);
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description || null,
      delivery_fee: parseFloat(form.delivery_fee) || 0,
      estimated_minutes: parseInt(form.estimated_minutes) || null,
      branch_id: form.branch_id || null,
      is_active: form.is_active,
      display_order: parseInt(form.display_order) || 0,
    };

    const url = editing
      ? `${API_URL}/api/v1/delivery-zones/${editing.id}`
      : `${API_URL}/api/v1/delivery-zones`;
    const method = editing ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Save failed");
      }
      setShowForm(false);
      showToast(editing ? "Zone updated." : "Zone created.");
      await loadAll(token);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const zone = deleteTarget;
    setDeleting(true);
    setBusyIds((s) => new Set(s).add(zone.id));
    try {
      const res = await fetch(`${API_URL}/api/v1/delivery-zones/${zone.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      setZones((prev) => prev.filter((z) => z.id !== zone.id));
      showToast("Zone deleted.");
      setDeleteTarget(null);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setDeleting(false);
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(zone.id);
        return next;
      });
    }
  }, [deleteTarget, token, showToast]);

  async function quickAssign(zone, branchId) {
    try {
      const res = await fetch(
        `${API_URL}/api/v1/delivery-zones/${zone.id}/assign-branch`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ branch_id: branchId }),
        }
      );
      if (!res.ok) throw new Error("Assign failed");
      const updated = await res.json();
      setZones((prev) => prev.map((z) => (z.id === updated.id ? updated : z)));
      showToast("Zone reassigned.");
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function fixOrphans() {
    if (branches.length === 0) return showToast("Create a branch first", "error");
    const defaultBranch = branches.find((b) => b.is_default) || branches[0];
    if (
      !confirm(
        `Assign all ${orphanCount} unlinked zone(s) to "${defaultBranch.name}"?`
      )
    )
      return;
    setFixing(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/delivery-zones/assign-orphans`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ branch_id: defaultBranch.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Fix failed");
      }
      const data = await res.json();
      showToast(data.message || "Zones linked.");
      await loadAll(token);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setFixing(false);
    }
  }

  const visibleZones =
    filterBranch === "all"
      ? zones
      : filterBranch === "shared"
      ? zones.filter((z) => !z.branch_id)
      : zones.filter((z) => z.branch_id === filterBranch);

  if (!authChecked || !token) {
    return (
      <div>
        <div className="h-8 w-48 rounded bg-gray-700/40 animate-pulse mb-6" />
        <ZonesSkeleton />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-white">
            Delivery Zones
          </h1>
          <p className="text-gray-400 text-sm mt-1 max-w-2xl">
            Each zone belongs to a branch. Customers only see zones for the
            branch they're ordering from.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-extrabold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/60"
        >
          <Plus className="w-4 h-4" />
          New Zone
        </button>
      </div>

      {orphanCount > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-amber-300">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>
              <strong>{orphanCount} zone(s)</strong> aren't linked to any
              branch — they appear in every branch's checkout.
            </span>
          </div>
          <button
            onClick={fixOrphans}
            disabled={fixing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-gold text-brand-dark text-xs font-extrabold disabled:opacity-50 transition-colors"
          >
            <Link2 className="w-3.5 h-3.5" />
            {fixing ? "Fixing…" : "Auto-link to default branch"}
          </button>
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
            onClick={() => loadAll(token)}
            className="flex items-center gap-1 text-xs font-bold underline hover:no-underline"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
        <button
          onClick={() => setFilterBranch("all")}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
            filterBranch === "all"
              ? "bg-brand-gold text-brand-dark"
              : "bg-brand-card border border-gray-700 text-gray-300 hover:text-white"
          }`}
        >
          All ({zones.length})
        </button>
        {branches.map((b) => {
          const count = zones.filter((z) => z.branch_id === b.id).length;
          return (
            <button
              key={b.id}
              onClick={() => setFilterBranch(b.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                filterBranch === b.id
                  ? "bg-brand-gold text-brand-dark"
                  : "bg-brand-card border border-gray-700 text-gray-300 hover:text-white"
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              {b.name} ({count})
            </button>
          );
        })}
        <button
          onClick={() => setFilterBranch("shared")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
            filterBranch === "shared"
              ? "bg-brand-gold text-brand-dark"
              : "bg-brand-card border border-gray-700 text-gray-300 hover:text-white"
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          Shared ({zones.filter((z) => !z.branch_id).length})
        </button>
      </div>

      {loading ? (
        <ZonesSkeleton />
      ) : visibleZones.length === 0 ? (
        <div className="bg-brand-card border border-gray-700 rounded-2xl p-12 text-center">
          <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No zones match this filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleZones.map((zone) => {
            const busy = busyIds.has(zone.id);
            return (
              <div
                key={zone.id}
                aria-busy={busy}
                className={`p-5 bg-brand-card border border-gray-700 rounded-2xl flex flex-col transition-all hover:border-gray-600 ${
                  busy ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-brand-gold shrink-0" />
                      {zone.name}
                    </div>
                    <div className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {zone.description}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold whitespace-nowrap ${
                      zone.is_active
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {zone.is_active ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>

                <div className="mb-3">
                  {zone.branch_id ? (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-brand-gold/15 text-brand-gold font-bold border border-brand-gold/30">
                      <Building2 className="w-3 h-3" />
                      {zone.branch_name || "Unknown branch"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-blue-500/15 text-blue-400 font-bold border border-blue-500/30">
                      <Globe className="w-3 h-3" />
                      Shared — visible in all branches
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-sm mb-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" />
                      Fee:
                    </span>
                    <span className="text-emerald-400 font-bold">
                      {formatGHS(zone.delivery_fee)}
                    </span>
                  </div>
                  {zone.estimated_minutes && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Est. time:
                      </span>
                      <span className="text-white font-bold">
                        {zone.estimated_minutes} min
                      </span>
                    </div>
                  )}
                </div>

                {branches.length > 1 && (
                  <div className="mb-3">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                      Reassign to branch
                    </label>
                    <select
                      value={zone.branch_id || "shared"}
                      onChange={(e) => quickAssign(zone, e.target.value)}
                      disabled={busy}
                      className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-gray-700 text-white text-xs focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none disabled:opacity-50"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                      <option value="shared">Shared (all branches)</option>
                    </select>
                  </div>
                )}

                <div className="mt-auto flex gap-2 pt-3 border-t border-gray-800">
                  <button
                    onClick={() => openEdit(zone)}
                    disabled={busy}
                    className="flex-1 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(zone)}
                    disabled={busy}
                    aria-label={`Delete ${zone.name}`}
                    className="px-3 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 disabled:opacity-50 text-red-400 text-xs font-bold transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <Modal
          onClose={() => setShowForm(false)}
          labelledBy="zone-form-title"
          disableClose={saving}
        >
          <form onSubmit={handleSave} aria-busy={saving} className="p-6 space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-gray-700">
              <h3
                id="zone-form-title"
                className="font-heading text-lg font-bold text-white"
              >
                {editing ? "Edit Zone" : "New Delivery Zone"}
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

            <Field label="Branch (this zone belongs to which kitchen?)" htmlFor="branch_id">
              <select
                id="branch_id"
                required
                value={form.branch_id}
                onChange={(e) =>
                  setForm({ ...form, branch_id: e.target.value })
                }
                disabled={saving}
                className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none disabled:opacity-50"
              >
                <option value="">— Select a branch —</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-500 mt-1">
                Leave blank only for zones that should appear in every branch.
              </p>
            </Field>

            <Field label="Zone Name" htmlFor="name">
              <input
                id="name"
                required
                disabled={saving}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. UG Legon Campus"
                className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none disabled:opacity-50"
              />
            </Field>

            <Field label="Description" htmlFor="description">
              <input
                id="description"
                disabled={saving}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Landmarks / area covered"
                className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none disabled:opacity-50"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Delivery Fee (GH₵)" htmlFor="delivery_fee">
                <input
                  id="delivery_fee"
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={saving}
                  value={form.delivery_fee}
                  onChange={(e) =>
                    setForm({ ...form, delivery_fee: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none disabled:opacity-50"
                />
              </Field>
              <Field label="Estimated Minutes" htmlFor="estimated_minutes">
                <input
                  id="estimated_minutes"
                  type="number"
                  min="0"
                  disabled={saving}
                  value={form.estimated_minutes}
                  onChange={(e) =>
                    setForm({ ...form, estimated_minutes: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none disabled:opacity-50"
                />
              </Field>
            </div>

            <Field label="Display Order" htmlFor="display_order">
              <input
                id="display_order"
                type="number"
                disabled={saving}
                value={form.display_order}
                onChange={(e) =>
                  setForm({ ...form, display_order: e.target.value })
                }
                className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none disabled:opacity-50"
              />
            </Field>

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
              Active (customers can select this zone)
            </label>

            <div className="flex gap-3 pt-4 border-t border-gray-700">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white font-bold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-brand-gold hover:bg-brand-amber disabled:opacity-50 text-brand-dark font-extrabold text-sm transition-colors"
              >
                {saving ? "Saving…" : editing ? "Save Changes" : "Create Zone"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          onClose={() => (deleting ? null : setDeleteTarget(null))}
          labelledBy="delete-zone-title"
          disableClose={deleting}
        >
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <h3
                id="delete-zone-title"
                className="font-heading text-lg font-bold text-white"
              >
                Delete zone?
              </h3>
            </div>
            <p className="text-sm text-gray-400">
              You're about to delete{" "}
              <span className="text-white font-bold">{deleteTarget.name}</span>.
              This can't be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white font-bold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-brand-crimson hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm transition-colors"
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