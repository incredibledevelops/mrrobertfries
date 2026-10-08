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

const EMPTY_FORM = {
  name: "",
  description: "",
  price: "",
  category_id: "",
  branch_id: "",
  image_url: "",
  tags: "",
  is_available: true,
  stock_count: "",
  low_stock_threshold: 5,
  display_order: 0,
};

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

function isLowStock(item) {
  const sc = item?.stock_count;
  if (sc === null || sc === undefined) return false;
  const threshold = item?.low_stock_threshold ?? 5;
  return sc > 0 && sc <= threshold;
}

function isOutOfStock(item) {
  return item?.stock_count === 0;
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
        className="relative bg-brand-card border border-gray-700 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        {children}
      </div>
    </div>
  );
}

function MenuGridSkeleton({ count = 6 }) {
  return (
    <div
      role="status"
      aria-label="Loading menu items"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-brand-card border border-gray-700 rounded-2xl overflow-hidden"
        >
          <SkeletonBlock className="h-40 rounded-none" />
          <div className="p-4 space-y-3">
            <SkeletonLine className="h-4 w-3/4" />
            <SkeletonLine className="h-3 w-full" />
            <SkeletonLine className="h-4 w-20" />
            <div className="flex gap-2 pt-2">
              <SkeletonBlock className="h-8 flex-1 rounded-lg" />
              <SkeletonBlock className="h-8 flex-1 rounded-lg" />
              <SkeletonBlock className="h-8 w-10 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StockBadge({ item }) {
  const sc = item?.stock_count;
  if (sc === null || sc === undefined) {
    return (
      <span className="text-[11px] text-gray-500 font-bold">
        ∞ Unlimited
      </span>
    );
  }
  if (sc === 0) {
    return (
      <span className="text-[11px] text-red-400 font-bold">
        ⛔ Out of stock
      </span>
    );
  }
  if (isLowStock(item)) {
    return (
      <span className="text-[11px] text-amber-400 font-bold">
        ⚠️ Only {sc} left
      </span>
    );
  }
  return (
    <span className="text-[11px] text-emerald-400 font-bold">
      ✓ {sc} in stock
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminMenu() {
  const router = useRouter();

  const [token, setToken] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [lowStock, setLowStock] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [tab, setTab] = useState("all"); // all | low-stock
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

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

  /* ---------- load ---------- */
  const loadAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [itemsRes, catRes, branchRes, lowRes] = await Promise.all([
        authFetch(`${API_URL}/api/v1/menu`),
        authFetch(`${API_URL}/api/v1/categories`),
        authFetch(`${API_URL}/api/v1/branches`),
        authFetch(`${API_URL}/api/v1/menu/low-stock`),
      ]);
      if (!itemsRes.ok || !catRes.ok || !branchRes.ok)
        throw new Error("Couldn't load menu data.");

      const [i, c, b] = await Promise.all([
        readJson(itemsRes),
        readJson(catRes),
        readJson(branchRes),
      ]);
      setItems(Array.isArray(i) ? i : []);
      setCategories(Array.isArray(c) ? c : []);
      setBranches(Array.isArray(b) ? b : []);

      // low-stock is optional — its absence shouldn't break the page
      if (lowRes.ok) {
        const l = await readJson(lowRes);
        setLowStock(Array.isArray(l) ? l : []);
      } else {
        setLowStock([]);
      }
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [token, authFetch]);

  useEffect(() => {
    if (!token) return;
    loadAll();
  }, [token, reloadKey, loadAll]);

  /* ---------- form open/close ---------- */
  const resetForm = useCallback(() => {
    setForm({
      ...EMPTY_FORM,
      category_id: categories[0]?.id || "",
    });
    setEditing(null);
    setFormError("");
    setUploadProgress(0);
  }, [categories]);

  const openCreate = useCallback(() => {
    resetForm();
    setShowForm(true);
  }, [resetForm]);

  const openEdit = useCallback((item) => {
    setForm({
      name: item.name || "",
      description: item.description || "",
      price: item.price ?? "",
      category_id: item.category_id || "",
      branch_id: item.branch_id || "",
      image_url: item.image_url || "",
      tags: Array.isArray(item.tags) ? item.tags.join(", ") : "",
      is_available: !!item.is_available,
      stock_count: item.stock_count ?? "",
      low_stock_threshold: item.low_stock_threshold ?? 5,
      display_order: item.display_order ?? 0,
    });
    setEditing(item);
    setFormError("");
    setUploadProgress(0);
    setShowForm(true);
  }, []);

  /* ---------- validation ---------- */
  const formValidation = useMemo(() => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Name is required.";
    if (!form.category_id) errs.category_id = "Pick a category.";
    if (
      form.price === "" ||
      !Number.isFinite(Number(form.price)) ||
      Number(form.price) < 0
    )
      errs.price = "Enter a price of 0 or higher.";
    if (
      form.stock_count !== "" &&
      (!Number.isFinite(Number(form.stock_count)) ||
        Number(form.stock_count) < 0)
    )
      errs.stock_count = "Must be 0 or higher.";
    if (
      form.low_stock_threshold !== "" &&
      (!Number.isFinite(Number(form.low_stock_threshold)) ||
        Number(form.low_stock_threshold) < 0)
    )
      errs.low_stock_threshold = "Must be 0 or higher.";
    if (
      form.display_order !== "" &&
      !Number.isFinite(Number(form.display_order))
    )
      errs.display_order = "Must be a number.";
    return errs;
  }, [form]);

  const formValid = Object.keys(formValidation).length === 0;

  /* ---------- image upload ---------- */
  const uploadFile = useCallback(
    async (file) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        showToast("Please choose an image file.", "error");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast("Image must be under 5MB.", "error");
        return;
      }

      setUploading(true);
      setUploadProgress(10);
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("subdir", "menu");

        // Use XHR for upload progress
        const url = `${API_URL}/api/v1/uploads`;
        const data = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", url);
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setUploadProgress(
                Math.round((e.loaded / e.total) * 90) + 10
              );
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                resolve(JSON.parse(xhr.responseText));
              } catch {
                reject(new Error("Invalid response."));
              }
            } else if (xhr.status === 401) {
              clearAdminToken();
              router.replace("/admin");
              reject(new Error("Session expired."));
            } else {
              reject(new Error("Upload failed."));
            }
          };
          xhr.onerror = () => reject(new Error("Upload failed."));
          xhr.send(fd);
        });

        const imageUrl = data?.url
          ? data.url.startsWith("http")
            ? data.url
            : `${API_URL}${data.url}`
          : "";
        if (!imageUrl) throw new Error("Upload didn't return a URL.");
        setForm((f) => ({ ...f, image_url: imageUrl }));
        showToast("Image uploaded.");
        setUploadProgress(100);
      } catch (err) {
        showToast(err.message || "Upload failed.", "error");
        setUploadProgress(0);
      } finally {
        setUploading(false);
      }
    },
    [token, router, showToast]
  );

  const handleUpload = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file) uploadFile(file);
      // allow re-selecting the same file
      e.target.value = "";
    },
    [uploadFile]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) uploadFile(file);
    },
    [uploadFile]
  );

  const clearImage = useCallback(() => {
    setForm((f) => ({ ...f, image_url: "" }));
    setUploadProgress(0);
  }, []);

  /* ---------- save ---------- */
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
        price: safeNumber(form.price, 0),
        category_id: form.category_id,
        branch_id: form.branch_id || null,
        image_url: form.image_url || null,
        tags: form.tags
          ? form.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        is_available: !!form.is_available,
        stock_count:
          form.stock_count === "" ? null : safeNumber(form.stock_count, 0),
        low_stock_threshold: safeNumber(form.low_stock_threshold, 5),
        display_order: safeNumber(form.display_order, 0),
      };

      const url = editing
        ? `${API_URL}/api/v1/menu/${editing.id}`
        : `${API_URL}/api/v1/menu`;
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
        resetForm();
        showToast(editing ? "Item updated." : "Item created.");
        setReloadKey((k) => k + 1);
      } catch (err) {
        setFormError(err.message || "Save failed.");
      } finally {
        setSaving(false);
      }
    },
    [form, formValid, editing, authFetch, resetForm, showToast]
  );

  /* ---------- delete ---------- */
  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const item = deleteTarget;
    setDeleting(true);
    setBusyIds((s) => new Set(s).add(item.id));
    try {
      const res = await authFetch(`${API_URL}/api/v1/menu/${item.id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        const err = await readJson(res);
        throw new Error(err.detail || "Delete failed.");
      }
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setLowStock((prev) => prev.filter((i) => i.id !== item.id));
      showToast("Item deleted.");
      setDeleteTarget(null);
    } catch (err) {
      showToast(err.message || "Delete failed.", "error");
    } finally {
      setDeleting(false);
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(item.id);
        return next;
      });
    }
  }, [deleteTarget, authFetch, showToast]);

  /* ---------- toggle stock (optimistic) ---------- */
  const toggleStock = useCallback(
    async (item) => {
      if (busyIds.has(item.id)) return;
      const prev = items;
      const next = !item.is_available;

      setItems((list) =>
        list.map((i) => (i.id === item.id ? { ...i, is_available: next } : i))
      );
      setBusyIds((s) => new Set(s).add(item.id));

      try {
        const res = await authFetch(
          `${API_URL}/api/v1/menu/${item.id}/stock`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_available: next }),
          }
        );
        if (!res.ok) {
          const err = await readJson(res);
          throw new Error(err.detail || "Toggle failed.");
        }
        const updated = await readJson(res);
        if (updated?.id) {
          setItems((list) =>
            list.map((i) => (i.id === updated.id ? updated : i))
          );
        }
        showToast(next ? "Marked as available." : "Marked as out of stock.");
      } catch (err) {
        setItems(prev); // rollback
        showToast(err.message || "Toggle failed.", "error");
      } finally {
        setBusyIds((s) => {
          const out = new Set(s);
          out.delete(item.id);
          return out;
        });
      }
    },
    [items, busyIds, authFetch, showToast]
  );

  /* ---------- quick restock (optimistic) ---------- */
  const quickRestock = useCallback(
    async (item, delta) => {
      if (busyIds.has(item.id)) return;
      if (item.stock_count === null || item.stock_count === undefined) return;

      const newStock = Math.max(0, safeNumber(item.stock_count) + delta);
      const prev = items;
      const prevLow = lowStock;

      // Optimistic
      setItems((list) =>
        list.map((i) =>
          i.id === item.id
            ? { ...i, stock_count: newStock, is_available: newStock > 0 }
            : i
        )
      );
      setLowStock((list) => list.filter((i) => i.id !== item.id));
      setBusyIds((s) => new Set(s).add(item.id));

      try {
        const res = await authFetch(`${API_URL}/api/v1/menu/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stock_count: newStock,
            is_available: newStock > 0,
          }),
        });
        if (!res.ok) {
          const err = await readJson(res);
          throw new Error(err.detail || "Restock failed.");
        }
        const updated = await readJson(res);
        if (updated?.id) {
          setItems((list) =>
            list.map((i) => (i.id === updated.id ? updated : i))
          );
        }
        showToast(
          delta > 0
            ? `Added ${delta} to stock.`
            : `Removed ${Math.abs(delta)} from stock.`
        );
      } catch (err) {
        setItems(prev);
        setLowStock(prevLow);
        showToast(err.message || "Restock failed.", "error");
      } finally {
        setBusyIds((s) => {
          const out = new Set(s);
          out.delete(item.id);
          return out;
        });
      }
    },
    [items, lowStock, busyIds, authFetch, showToast]
  );

  /* ---------- derived ---------- */
  const baseList = tab === "low-stock" ? lowStock : items;
  const visibleItems = useMemo(() => {
    let list = baseList;
    if (categoryFilter !== "all") {
      list = list.filter((i) => i.category_id === categoryFilter);
    }
    if (branchFilter !== "all") {
      list = list.filter((i) =>
        branchFilter === "__shared__"
          ? !i.branch_id
          : i.branch_id === branchFilter
      );
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.name?.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q) ||
          (Array.isArray(i.tags) &&
            i.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }
    return list;
  }, [baseList, categoryFilter, branchFilter, query]);

  const branchMap = useMemo(() => {
    const m = new Map();
    for (const b of branches) m.set(b.id, b.name);
    return m;
  }, [branches]);

  const categoryMap = useMemo(() => {
    const m = new Map();
    for (const c of categories) m.set(c.id, c.name);
    return m;
  }, [categories]);

  /* ---------- render guard ---------- */
  if (!authChecked || !token) {
    return (
      <div>
        <div className="h-8 w-48 rounded bg-gray-700/40 animate-pulse mb-6" />
        <MenuGridSkeleton count={6} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-white">
            Menu Items
          </h1>
          <p className="text-gray-400 text-sm mt-1 max-w-2xl">
            Manage dishes, stock levels, and availability.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-5 py-3 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-extrabold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/60"
        >
          + New Item
        </button>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Filter menu items"
        className="flex flex-wrap gap-2 mb-4"
      >
        <button
          role="tab"
          aria-selected={tab === "all"}
          onClick={() => setTab("all")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/40 ${
            tab === "all"
              ? "bg-brand-gold text-brand-dark"
              : "bg-brand-card border border-gray-700 text-gray-300 hover:text-white"
          }`}
        >
          All Items ({items.length})
        </button>
        <button
          role="tab"
          aria-selected={tab === "low-stock"}
          onClick={() => setTab("low-stock")}
          disabled={lowStock.length === 0}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/40 disabled:opacity-50 disabled:cursor-not-allowed ${
            tab === "low-stock"
              ? "bg-brand-gold text-brand-dark"
              : lowStock.length === 0
              ? "bg-brand-card border border-gray-700 text-gray-600"
              : "bg-brand-card border border-amber-500/40 text-amber-400 hover:text-amber-300"
          }`}
        >
          ⚠️ Low Stock ({lowStock.length})
        </button>
      </div>

      {/* Filters */}
      {!loading && items.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              🔍
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search items, tags…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-brand-card border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none transition-colors"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by category"
            className="px-3 py-2.5 rounded-xl bg-brand-card border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            aria-label="Filter by branch"
            className="px-3 py-2.5 rounded-xl bg-brand-card border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none"
          >
            <option value="all">All branches</option>
            <option value="__shared__">🌍 Shared only</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                🏢 {b.name}
              </option>
            ))}
          </select>
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
        <MenuGridSkeleton count={6} />
      ) : visibleItems.length === 0 ? (
        <div className="bg-brand-card border border-gray-700 rounded-2xl p-12 text-center">
          <div className="text-5xl mb-3" aria-hidden="true">
            {tab === "low-stock"
              ? "🎉"
              : items.length === 0
              ? "🍟"
              : "🔍"}
          </div>
          <h2 className="font-bold text-white text-lg">
            {tab === "low-stock"
              ? "Nothing running low"
              : items.length === 0
              ? "No menu items yet"
              : "No matching items"}
          </h2>
          <p className="text-gray-400 text-sm mt-1 max-w-sm mx-auto">
            {tab === "low-stock"
              ? "All items are well-stocked. Nice work!"
              : items.length === 0
              ? "Add your first dish to start taking orders."
              : "Try changing filters or clearing the search."}
          </p>
          {items.length === 0 ? (
            <button
              onClick={openCreate}
              className="mt-5 px-5 py-2.5 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-bold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/60"
            >
              Create your first item
            </button>
          ) : (
            <button
              onClick={() => {
                setQuery("");
                setCategoryFilter("all");
                setBranchFilter("all");
              }}
              className="mt-4 text-brand-gold text-xs font-bold underline hover:no-underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleItems.map((item) => {
            const busy = busyIds.has(item.id);
            const out = isOutOfStock(item);
            const low = isLowStock(item);
            const branchName = item.branch_id
              ? branchMap.get(item.branch_id)
              : null;
            const categoryName = item.category_id
              ? categoryMap.get(item.category_id)
              : null;

            return (
              <article
                key={item.id}
                aria-busy={busy}
                className={`bg-brand-card border rounded-2xl overflow-hidden flex flex-col transition-all ${
                  low
                    ? "border-amber-500/40"
                    : "border-gray-700 hover:border-gray-600"
                } ${busy ? "opacity-60" : ""}`}
              >
                <div className="relative h-40 bg-gray-800">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-gray-600">
                      🍟
                    </div>
                  )}

                  {/* Category pill */}
                  {categoryName && (
                    <span className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-brand-dark/90 text-[10px] font-bold text-gray-300 border border-gray-700">
                      {categoryName}
                    </span>
                  )}

                  {/* Availability pill */}
                  <span
                    className={`absolute top-2 right-2 px-2 py-1 rounded-lg text-[10px] font-bold ${
                      item.is_available
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {item.is_available ? "Available" : "Unavailable"}
                  </span>

                  {out && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-red-400 font-black text-lg">
                        SOLD OUT
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4 flex-1">
                  <h3 className="font-bold text-white truncate">
                    {item.name}
                  </h3>
                  {branchName && (
                    <p className="text-[10px] text-brand-gold mt-1 font-bold">
                      🏢 {branchName}
                    </p>
                  )}
                  {!branchName && (
                    <p className="text-[10px] text-blue-400 mt-1 font-bold">
                      🌍 Shared across all branches
                    </p>
                  )}
                  {item.description && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  <div className="text-brand-gold font-extrabold mt-2">
                    {formatGHS(item.price)}
                  </div>

                  {/* Stock indicator */}
                  <div className="mt-3 pt-3 border-t border-gray-800">
                    <StockBadge item={item} />
                  </div>
                </div>

                <div className="p-4 pt-0 space-y-2">
                  {item.stock_count !== null &&
                    item.stock_count !== undefined && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => quickRestock(item, 10)}
                          disabled={busy}
                          className="flex-1 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 disabled:opacity-50 text-emerald-400 text-[10px] font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        >
                          +10
                        </button>
                        <button
                          onClick={() => quickRestock(item, 25)}
                          disabled={busy}
                          className="flex-1 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 disabled:opacity-50 text-emerald-400 text-[10px] font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        >
                          +25
                        </button>
                        <button
                          onClick={() => quickRestock(item, -5)}
                          disabled={busy}
                          className="flex-1 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 disabled:opacity-50 text-red-400 text-[10px] font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40"
                        >
                          −5
                        </button>
                      </div>
                    )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(item)}
                      disabled={busy}
                      className="flex-1 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleStock(item)}
                      disabled={busy}
                      className="flex-1 py-2 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 disabled:opacity-50 text-amber-400 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    >
                      {busy
                        ? "…"
                        : item.is_available
                        ? "Mark out"
                        : "Mark in"}
                    </button>
                    <button
                      onClick={() => setDeleteTarget(item)}
                      disabled={busy}
                      aria-label={`Delete ${item.name}`}
                      className="px-3 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 disabled:opacity-50 text-red-400 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ---------- Add/Edit form modal ---------- */}
      {showForm && (
        <Modal
          onClose={() => setShowForm(false)}
          labelledBy="menu-form-title"
          disableClose={saving || uploading}
        >
          <form onSubmit={handleSave} aria-busy={saving} className="p-6 space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-gray-700">
              <h3
                id="menu-form-title"
                className="font-heading text-lg font-bold text-white"
              >
                {editing ? "Edit Item" : "New Menu Item"}
              </h3>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={saving || uploading}
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

            <Field label="Name" htmlFor="name">
              <input
                id="name"
                required
                autoFocus
                disabled={saving}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Robert's Special Bowl"
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
              <textarea
                id="description"
                rows={2}
                disabled={saving}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="What's in it?"
                className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none resize-none transition-colors disabled:opacity-60"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Price (GH₵)" htmlFor="price">
                <input
                  id="price"
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  disabled={saving}
                  value={form.price}
                  onChange={(e) =>
                    setForm({ ...form, price: e.target.value })
                  }
                  aria-invalid={!!formValidation.price}
                  className={`w-full px-4 py-3 rounded-xl bg-brand-dark border text-white text-sm outline-none transition-colors focus:ring-2 disabled:opacity-60 ${
                    formValidation.price
                      ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30"
                      : "border-gray-700 focus:border-brand-gold focus:ring-brand-gold/40"
                  }`}
                />
                {formValidation.price && (
                  <p className="text-[11px] text-red-400 mt-1">
                    {formValidation.price}
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
                  aria-invalid={!!formValidation.display_order}
                  className={`w-full px-4 py-3 rounded-xl bg-brand-dark border text-white text-sm outline-none transition-colors focus:ring-2 disabled:opacity-60 ${
                    formValidation.display_order
                      ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30"
                      : "border-gray-700 focus:border-brand-gold focus:ring-brand-gold/40"
                  }`}
                />
              </Field>
            </div>

            <Field label="Category" htmlFor="category_id">
              <select
                id="category_id"
                required
                disabled={saving}
                value={form.category_id}
                onChange={(e) =>
                  setForm({ ...form, category_id: e.target.value })
                }
                aria-invalid={!!formValidation.category_id}
                className={`w-full px-4 py-3 rounded-xl bg-brand-dark border text-white text-sm outline-none transition-colors focus:ring-2 disabled:opacity-60 ${
                  formValidation.category_id
                    ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30"
                    : "border-gray-700 focus:border-brand-gold focus:ring-brand-gold/40"
                }`}
              >
                <option value="">Select category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {formValidation.category_id && (
                <p className="text-[11px] text-red-400 mt-1">
                  {formValidation.category_id}
                </p>
              )}
            </Field>

            <Field
              label="Branch"
              htmlFor="branch_id"
              hint="Leave blank to share this item across all branches."
            >
              <select
                id="branch_id"
                disabled={saving}
                value={form.branch_id}
                onChange={(e) =>
                  setForm({ ...form, branch_id: e.target.value })
                }
                className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none transition-colors disabled:opacity-60"
              >
                <option value="">🌍 Shared (all branches)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    🏢 {b.name}
                  </option>
                ))}
              </select>
            </Field>

            {/* Inventory */}
            <div className="p-4 rounded-xl bg-brand-dark border border-gray-700 space-y-3">
              <div className="text-xs font-bold text-brand-gold uppercase tracking-wider">
                📦 Inventory
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Stock Count"
                  htmlFor="stock_count"
                  hint="Leave blank for unlimited."
                >
                  <input
                    id="stock_count"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    disabled={saving}
                    value={form.stock_count}
                    onChange={(e) =>
                      setForm({ ...form, stock_count: e.target.value })
                    }
                    placeholder="∞"
                    aria-invalid={!!formValidation.stock_count}
                    className={`w-full px-4 py-3 rounded-xl bg-brand-card border text-white text-sm outline-none transition-colors focus:ring-2 disabled:opacity-60 ${
                      formValidation.stock_count
                        ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30"
                        : "border-gray-700 focus:border-brand-gold focus:ring-brand-gold/40"
                    }`}
                  />
                  {formValidation.stock_count && (
                    <p className="text-[11px] text-red-400 mt-1">
                      {formValidation.stock_count}
                    </p>
                  )}
                </Field>
                <Field label="Low Stock Alert At" htmlFor="low_stock_threshold">
                  <input
                    id="low_stock_threshold"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    disabled={saving}
                    value={form.low_stock_threshold}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        low_stock_threshold: e.target.value,
                      })
                    }
                    aria-invalid={!!formValidation.low_stock_threshold}
                    className={`w-full px-4 py-3 rounded-xl bg-brand-card border text-white text-sm outline-none transition-colors focus:ring-2 disabled:opacity-60 ${
                      formValidation.low_stock_threshold
                        ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30"
                        : "border-gray-700 focus:border-brand-gold focus:ring-brand-gold/40"
                    }`}
                  />
                </Field>
              </div>
              <p className="text-[11px] text-gray-500">
                Stock is decremented automatically when orders are paid.
              </p>
            </div>

            <Field
              label="Tags"
              htmlFor="tags"
              hint="Comma separated — used for search and filtering."
            >
              <input
                id="tags"
                disabled={saving}
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="loaded, chicken, spicy"
                className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none transition-colors disabled:opacity-60"
              />
            </Field>

            {/* Image upload */}
            <div>
              <span className="block text-xs font-bold text-gray-300 mb-1">
                Image
              </span>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`relative rounded-xl border-2 border-dashed transition-colors overflow-hidden ${
                  dragOver
                    ? "border-brand-gold bg-brand-gold/5"
                    : "border-gray-700 bg-brand-dark"
                }`}
              >
                {form.image_url ? (
                  <>
                    <img
                      src={form.image_url}
                      alt="preview"
                      className="w-full h-40 object-cover"
                    />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button
                        type="button"
                        onClick={clearImage}
                        disabled={saving || uploading}
                        className="px-2 py-1 rounded-lg bg-red-600/90 text-white text-[11px] font-bold hover:bg-red-600 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  </>
                ) : (
                  <label className="flex flex-col items-center justify-center h-32 cursor-pointer text-gray-400 hover:text-gray-200 transition-colors">
                    <span className="text-3xl mb-1">📷</span>
                    <span className="text-xs font-bold">
                      {dragOver
                        ? "Drop image here"
                        : "Click or drag to upload"}
                    </span>
                    <span className="text-[10px] text-gray-500 mt-0.5">
                      PNG, JPG, WebP — max 5MB
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUpload}
                      disabled={saving || uploading}
                      className="sr-only"
                    />
                  </label>
                )}

                {uploading && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white text-xs">
                    <div className="w-32 h-1 rounded-full bg-white/20 overflow-hidden mb-2">
                      <div
                        className="h-full bg-brand-gold transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <span>Uploading… {uploadProgress}%</span>
                  </div>
                )}

                {form.image_url && !uploading && (
                  <label className="absolute bottom-2 right-2 px-3 py-1.5 rounded-lg bg-black/70 text-white text-[11px] font-bold cursor-pointer hover:bg-black/90 transition-colors">
                    Replace
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUpload}
                      disabled={saving}
                      className="sr-only"
                    />
                  </label>
                )}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                disabled={saving}
                checked={form.is_available}
                onChange={(e) =>
                  setForm({ ...form, is_available: e.target.checked })
                }
                className="accent-brand-gold"
              />
              Available for ordering
            </label>

            {/* Sticky footer */}
            <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-4 bg-brand-card border-t border-gray-700 flex gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={saving || uploading}
                className="flex-1 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white font-bold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || uploading || !formValid}
                className="flex-1 py-3 rounded-xl bg-brand-gold hover:bg-brand-amber disabled:opacity-50 disabled:cursor-not-allowed text-brand-dark font-extrabold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/60"
              >
                {saving
                  ? "Saving…"
                  : editing
                  ? "Save Changes"
                  : "Create Item"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ---------- Delete confirm ---------- */}
      {deleteTarget && (
        <Modal
          onClose={() => (deleting ? null : setDeleteTarget(null))}
          labelledBy="delete-menu-title"
          disableClose={deleting}
        >
          <div className="p-6 space-y-4">
            <h3
              id="delete-menu-title"
              className="font-heading text-lg font-bold text-white"
            >
              Delete menu item?
            </h3>
            <p className="text-sm text-gray-400">
              You're about to delete{" "}
              <span className="text-white font-bold">
                {deleteTarget.name}
              </span>
              . This can't be undone.
            </p>
            <p className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
              Past orders that included this item will keep their history.
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