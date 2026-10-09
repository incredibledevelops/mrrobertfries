"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Home,
  Briefcase,
  GraduationCap,
  Building2,
  X,
  AlertCircle,
  Check,
  Loader2,
} from "lucide-react";
import { API_URL } from "@/lib/api";
import {
  getCustomerToken,
  clearCustomerTokens,
  customerFetch,
} from "@/lib/customerAuth";
import { AccountHeader } from "../page";
import { SkeletonBlock, SkeletonLine } from "@/components/Skeleton";

const LABEL_ICONS = {
  Home: Home,
  Work: Briefcase,
  School: GraduationCap,
  Other: Building2,
};

const LABEL_OPTIONS = ["Home", "Work", "School", "Other"];

function ghs(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "GH₵ 0.00";
  return `GH₵ ${n.toFixed(2)}`;
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function addressKey(a, i) {
  return a?.id ?? a?.index ?? i;
}

export default function AddressesPage() {
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [zones, setZones] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [busyIds, setBusyIds] = useState(() => new Set());
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const [form, setForm] = useState({
    label: "Home",
    zone_id: "",
    zone_name: "",
    address: "",
    is_default: false,
  });

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
        const [meRes, addrRes, zonesRes] = await Promise.all([
          customerFetch(`${API_URL}/api/v1/customer-account/me`),
          customerFetch(`${API_URL}/api/v1/customer-account/addresses`),
          fetch(`${API_URL}/api/v1/delivery-zones?active_only=true`),
        ]);

        if (meRes.status === 401 || addrRes.status === 401) {
          clearCustomerTokens();
          router.replace("/account");
          return;
        }
        if (!meRes.ok || !addrRes.ok || !zonesRes.ok) {
          throw new Error("Couldn't load your addresses.");
        }

        const [me, addr, zs] = await Promise.all([
          readJson(meRes),
          readJson(addrRes),
          readJson(zonesRes),
        ]);
        if (cancelled) return;
        setProfile(me);
        setAddresses(Array.isArray(addr) ? addr : []);
        setZones(Array.isArray(zs) ? zs : []);
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

  const logout = useCallback(() => {
    clearCustomerTokens();
    router.push("/account");
  }, [router]);

  const openCreate = useCallback(() => {
    setForm({
      label: "Home",
      zone_id: zones[0]?.id || "",
      zone_name: zones[0]?.name || "",
      address: "",
      is_default: addresses.length === 0,
    });
    setEditingIndex(null);
    setFormError("");
    setShowForm(true);
  }, [zones, addresses.length]);

  const openEdit = useCallback(
    (index) => {
      const a = addresses[index];
      if (!a) return;
      setForm({
        label: a.label || "Home",
        zone_id: a.zone_id || "",
        zone_name: a.zone_name || "",
        address: a.address || "",
        is_default: !!a.is_default,
      });
      setEditingIndex(index);
      setFormError("");
      setShowForm(true);
    },
    [addresses]
  );

  const isFormValid = form.address.trim().length >= 4 && !!form.zone_id && !!form.label;

  const handleSave = useCallback(
    async (e) => {
      e.preventDefault();
      setFormError("");
      if (!isFormValid) {
        setFormError("Please fill in the address and select a delivery zone.");
        return;
      }

      const payload = {
        label: form.label,
        zone_id: form.zone_id || null,
        zone_name: form.zone_name,
        address: form.address.trim(),
        is_default: form.is_default,
      };

      const url = editingIndex === null
        ? `${API_URL}/api/v1/customer-account/addresses`
        : `${API_URL}/api/v1/customer-account/addresses/${editingIndex}`;
      const method = editingIndex === null ? "POST" : "PATCH";

      setSaving(true);
      try {
        const res = await customerFetch(url, { method, body: JSON.stringify(payload) });
        if (res.status === 401) {
          clearCustomerTokens();
          router.replace("/account");
          return;
        }
        if (!res.ok) {
          const err = await readJson(res);
          throw new Error(err.detail || "Failed to save address.");
        }
        const updated = await readJson(res);
        setAddresses(Array.isArray(updated) ? updated : addresses);
        setShowForm(false);
        showToast(editingIndex === null ? "Address added." : "Address updated.");
      } catch (err) {
        setFormError(err.message || "Failed to save address.");
      } finally {
        setSaving(false);
      }
    },
    [form, isFormValid, editingIndex, addresses, router, showToast]
  );

  const confirmDelete = useCallback(async () => {
    if (deleteTarget === null) return;
    const index = deleteTarget;
    const key = addressKey(addresses[index], index);

    setBusyIds((s) => new Set(s).add(key));
    setDeleting(true);
    try {
      const res = await customerFetch(
        `${API_URL}/api/v1/customer-account/addresses/${index}`,
        { method: "DELETE" }
      );
      if (res.status === 401) {
        clearCustomerTokens();
        router.replace("/account");
        return;
      }
      if (!res.ok) throw new Error("Couldn't delete that address.");
      const updated = await readJson(res);
      setAddresses(Array.isArray(updated) ? updated : addresses.filter((_, i) => i !== index));
      showToast("Address deleted.");
      setDeleteTarget(null);
    } catch (err) {
      showToast(err.message || "Delete failed.", "error");
    } finally {
      setDeleting(false);
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(key);
        return next;
      });
    }
  }, [deleteTarget, addresses, router, showToast]);

  const onZoneChange = useCallback(
    (zoneId) => {
      const z = zones.find((x) => x.id === zoneId);
      setForm((f) => ({ ...f, zone_id: zoneId, zone_name: z?.name || "" }));
    },
    [zones]
  );

  const defaultAddress = useMemo(() => addresses.find((a) => a.is_default), [addresses]);

  return (
    <div className="min-h-screen bg-brand-dark text-gray-100">
      <AccountHeader profile={profile} onLogout={logout} activeTab="/account/addresses" />

      <main className="max-w-4xl mx-auto p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-extrabold text-white">
              Saved Addresses
            </h1>
            {!loading && addresses.length > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                {addresses.length} address{addresses.length === 1 ? "" : "es"} saved
                {defaultAddress ? ` · Default: ${defaultAddress.label}` : ""}
              </p>
            )}
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-extrabold text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add New
          </button>
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
          <AddressListSkeleton count={2} />
        ) : addresses.length === 0 ? (
          <div className="bg-brand-card border border-gray-700 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-gray-600" />
            </div>
            <h2 className="font-bold text-white text-lg">No addresses yet</h2>
            <p className="text-gray-400 text-sm mt-1">
              Save an address to check out faster next time.
            </p>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-bold text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add your first address
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((a, i) => {
              const key = addressKey(a, i);
              const busy = busyIds.has(key);
              const LabelIcon = LABEL_ICONS[a.label] || MapPin;
              return (
                <div
                  key={key}
                  className={`bg-brand-card border border-gray-700 rounded-2xl p-5 flex items-start justify-between gap-4 transition-opacity ${busy ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center shrink-0">
                      <LabelIcon className="w-5 h-5 text-brand-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white">{a.label}</span>
                        {a.is_default && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-brand-gold/20 text-brand-gold font-bold inline-flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" />
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-300 mt-1 break-words">
                        {a.address}
                      </div>
                      {a.zone_name && (
                        <div className="text-xs text-gray-500 mt-1 inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {a.zone_name}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => openEdit(i)}
                      disabled={busy}
                      aria-label={`Edit ${a.label} address`}
                      className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(i)}
                      disabled={busy}
                      aria-label={`Delete ${a.label} address`}
                      className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 disabled:opacity-50 text-red-400 text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {showForm && (
        <Modal onClose={() => (saving ? null : setShowForm(false))} labelledBy="address-form-title">
          <form onSubmit={handleSave} className="space-y-4" aria-busy={saving}>
            <div className="flex items-start justify-between">
              <h3 id="address-form-title" className="font-heading text-lg font-bold text-white">
                {editingIndex === null ? "Add Address" : "Edit Address"}
              </h3>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={saving}
                aria-label="Close"
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div role="alert" className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs inline-flex items-start gap-2 w-full">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {formError}
              </div>
            )}

            <div>
              <span className="block text-xs font-bold text-gray-300 mb-1">Label</span>
              <div role="radiogroup" className="grid grid-cols-4 gap-2">
                {LABEL_OPTIONS.map((l) => {
                  const LIcon = LABEL_ICONS[l] || MapPin;
                  const active = form.label === l;
                  return (
                    <button
                      key={l}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setForm((f) => ({ ...f, label: l }))}
                      className={`py-2.5 rounded-lg text-xs font-bold transition-colors inline-flex flex-col items-center gap-1 ${
                        active
                          ? "bg-brand-gold text-brand-dark"
                          : "bg-brand-dark border border-gray-700 text-gray-300 hover:text-white"
                      }`}
                    >
                      <LIcon className="w-3.5 h-3.5" />
                      {l}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="zone_id" className="block text-xs font-bold text-gray-300 mb-1">
                Delivery Zone
              </label>
              <select
                id="zone_id"
                value={form.zone_id}
                onChange={(e) => onZoneChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold outline-none transition-colors"
              >
                {zones.length === 0 && <option value="">No zones available</option>}
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} — {ghs(z.delivery_fee)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="address" className="block text-xs font-bold text-gray-300 mb-1">
                Full Address
              </label>
              <textarea
                id="address"
                required
                rows={2}
                autoComplete="street-address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="e.g. Pent Block C Room 204, UG Legon"
                className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold outline-none resize-none transition-colors"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
                className="accent-brand-gold"
              />
              Set as default address
            </label>

            <div className="flex gap-3 pt-2">
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
                disabled={saving || !isFormValid}
                className="flex-1 py-3 rounded-xl bg-brand-gold hover:bg-brand-amber disabled:opacity-50 text-brand-dark font-extrabold text-sm transition-colors inline-flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving…
                  </>
                ) : "Save"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget !== null && (
        <Modal onClose={() => (deleting ? null : setDeleteTarget(null))} labelledBy="delete-title">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1">
              <h3 id="delete-title" className="font-heading text-lg font-bold text-white">
                Delete this address?
              </h3>
              <p className="text-xs text-gray-400 mt-1.5">
                {addresses[deleteTarget]?.label} · {addresses[deleteTarget]?.address}
              </p>
              <p className="text-xs text-gray-500 mt-2">This can't be undone.</p>
            </div>
          </div>
          <div className="flex gap-3 pt-5">
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
              className="flex-1 py-3 rounded-xl bg-brand-crimson hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm transition-colors inline-flex items-center justify-center gap-2"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting…
                </>
              ) : "Delete"}
            </button>
          </div>
        </Modal>
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-xl border text-sm font-semibold shadow-lg backdrop-blur ${
            toast.type === "error"
              ? "bg-red-950/90 border-red-700 text-red-200"
              : "bg-emerald-950/90 border-emerald-700 text-emerald-200"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

function Modal({ children, onClose, labelledBy }) {
  const panelRef = useRef(null);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first?.focus?.();

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
      <div onClick={onClose} className="absolute inset-0 bg-black/80" aria-hidden="true" />
      <div ref={panelRef} className="relative bg-brand-card border border-gray-700 rounded-3xl max-w-md w-full p-6 shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function AddressListSkeleton({ count = 2 }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading addresses">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-brand-card border border-gray-700 rounded-2xl p-5 flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <SkeletonLine className="h-4 w-24" />
            <SkeletonLine className="h-3 w-3/4" />
            <SkeletonLine className="h-3 w-1/3" />
          </div>
          <div className="flex flex-col gap-2">
            <SkeletonBlock className="h-7 w-16 rounded-lg" />
            <SkeletonBlock className="h-7 w-16 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}