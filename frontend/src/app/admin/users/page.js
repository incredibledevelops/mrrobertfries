"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  Search,
  Eye,
  EyeOff,
  Key,
  Power,
  PowerOff,
  Users as UsersIcon,
  Shield,
  User,
  RefreshCw,
} from "lucide-react";
import { API_URL } from "@/lib/api";
import { SkeletonBlock, SkeletonLine } from "@/components/Skeleton";

const TOKEN_KEY = "mrf_token";
const TOKEN_ISSUED_AT_KEY = "mrf_token_issued_at";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const ROLE_COLORS = {
  admin: "bg-brand-gold/20 text-brand-gold",
  staff: "bg-emerald-500/20 text-emerald-400",
  kitchen: "bg-amber-500/20 text-amber-400",
  rider: "bg-blue-500/20 text-blue-400",
};

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
  { value: "kitchen", label: "Kitchen" },
  { value: "rider", label: "Rider" },
];

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

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-300 mb-1">
        {label}
      </label>
      {children}
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

function UsersSkeleton({ rows = 6 }) {
  return (
    <div
      role="status"
      aria-label="Loading users"
      className="bg-brand-card border border-gray-700 rounded-2xl overflow-hidden"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="p-4 flex items-center gap-4 border-b border-gray-800 last:border-0"
        >
          <SkeletonBlock className="w-10 h-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <SkeletonLine className="h-4 w-32" />
            <SkeletonLine className="h-3 w-48" />
          </div>
          <SkeletonBlock className="h-6 w-16 rounded" />
          <div className="flex gap-1">
            <SkeletonBlock className="h-7 w-12 rounded-lg" />
            <SkeletonBlock className="h-7 w-12 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminUsers() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);
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

  const emptyForm = {
    full_name: "",
    email: "",
    password: "",
    phone: "",
    role: "kitchen",
    branch_id: "",
    vehicle: "",
    plate_number: "",
    is_active: true,
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const t = getAdminToken();
    if (!t) {
      router.replace("/admin");
      return;
    }
    setToken(t);
    setAuthChecked(true);
    load(t);
  }, [router]);

  const authFetch = useCallback(
    async (url, init = {}) => {
      const headers = {
        ...(init.headers || {}),
        Authorization: `Bearer ${token}`,
      };
      const res = await fetch(url, { ...init, headers });
      if (res.status === 401) {
        try {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(TOKEN_ISSUED_AT_KEY);
        } catch {}
        router.replace("/admin");
        throw new Error("Session expired. Please sign in again.");
      }
      return res;
    },
    [token, router]
  );

  async function load(t) {
    setLoading(true);
    setError("");
    try {
      const [usersRes, branchesRes, meRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/auth/users`, {
          headers: { Authorization: `Bearer ${t}` },
        }),
        fetch(`${API_URL}/api/v1/branches`, {
          headers: { Authorization: `Bearer ${t}` },
        }),
        fetch(`${API_URL}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${t}` },
        }),
      ]);
      setUsers(await usersRes.json());
      setBranches(await branchesRes.json());
      setMe(await meRes.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setForm(emptyForm);
    setEditing(null);
    setFormError("");
    setShowForm(true);
  }

  function openEdit(u) {
    setForm({
      full_name: u.full_name,
      email: u.email,
      password: "",
      phone: u.phone || "",
      role: u.role,
      branch_id: u.branch_id || "",
      vehicle: u.vehicle || "",
      plate_number: u.plate_number || "",
      is_active: u.is_active,
    });
    setEditing(u);
    setFormError("");
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setFormError("");

    const payload = {
      full_name: form.full_name,
      phone: form.phone || null,
      role: form.role,
      branch_id: form.branch_id || null,
      vehicle: form.vehicle || null,
      plate_number: form.plate_number || null,
    };

    if (editing) {
      payload.is_active = form.is_active;
    } else {
      payload.email = form.email;
      payload.password = form.password;
    }

    const url = editing
      ? `${API_URL}/api/v1/auth/users/${editing.id}`
      : `${API_URL}/api/v1/auth/users`;
    const method = editing ? "PATCH" : "POST";

    try {
      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Save failed");
      }
      setShowForm(false);
      showToast(editing ? "User updated." : "User created.");
      await load(token);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const u = deleteTarget;
    setDeleting(true);
    setBusyIds((s) => new Set(s).add(u.id));
    try {
      const res = await authFetch(`${API_URL}/api/v1/auth/users/${u.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Delete failed");
      }
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      showToast("User deleted.");
      setDeleteTarget(null);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setDeleting(false);
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(u.id);
        return next;
      });
    }
  }, [deleteTarget, authFetch, showToast]);

  async function toggleActive(u) {
    if (busyIds.has(u.id)) return;
    const prev = users;
    setUsers((list) =>
      list.map((x) => (x.id === u.id ? { ...x, is_active: !x.is_active } : x))
    );
    setBusyIds((s) => new Set(s).add(u.id));
    try {
      const res = await authFetch(`${API_URL}/api/v1/auth/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !u.is_active }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Toggle failed");
      }
      const updated = await res.json();
      setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      showToast(updated.is_active ? "User enabled." : "User disabled.");
    } catch (err) {
      setUsers(prev);
      showToast(err.message, "error");
    } finally {
      setBusyIds((s) => {
        const out = new Set(s);
        out.delete(u.id);
        return out;
      });
    }
  }

  async function submitResetPassword(e) {
    e.preventDefault();
    setResetting(true);
    try {
      const res = await authFetch(
        `${API_URL}/api/v1/auth/users/${resetUser.id}/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ new_password: resetPassword }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Reset failed");
      }
      setResetUser(null);
      setResetPassword("");
      showToast("Password reset successfully");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setResetting(false);
    }
  }

  const visible = useMemo(() => {
    let list = users;
    if (filterRole !== "all") list = list.filter((u) => u.role === filterRole);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.full_name.toLowerCase().includes(s) ||
          u.email.toLowerCase().includes(s) ||
          (u.phone && u.phone.includes(s))
      );
    }
    return list;
  }, [users, filterRole, search]);

  const branchName = (id) => branches.find((b) => b.id === id)?.name || "—";

  if (!authChecked || !token) {
    return (
      <div>
        <div className="h-8 w-48 rounded bg-gray-700/40 animate-pulse mb-6" />
        <UsersSkeleton rows={6} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-white">
            Users
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage admins, kitchen staff, and riders.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-extrabold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/60"
        >
          <Plus className="w-4 h-4" />
          New User
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-brand-card border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none transition-colors"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {[{ value: "all", label: "All" }, ...ROLES].map((r) => (
            <button
              key={r.value}
              onClick={() => setFilterRole(r.value)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/40 ${
                filterRole === r.value
                  ? "bg-brand-gold text-brand-dark"
                  : "bg-brand-card border border-gray-700 text-gray-300 hover:text-white"
              }`}
            >
              {r.label}
            </button>
          ))}
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
            onClick={() => load(token)}
            className="flex items-center gap-1 text-xs font-bold underline hover:no-underline"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <UsersSkeleton rows={6} />
      ) : visible.length === 0 ? (
        <div className="bg-brand-card border border-gray-700 rounded-2xl p-12 text-center">
          <UsersIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">
            {users.length === 0 ? "No users yet." : "No users match this filter."}
          </p>
        </div>
      ) : (
        <div className="bg-brand-card border border-gray-700 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">User list</caption>
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider">
                    Branch
                  </th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((u) => {
                  const busy = busyIds.has(u.id);
                  const isSelf = u.id === me?.id;
                  return (
                    <tr
                      key={u.id}
                      aria-busy={busy}
                      className={`border-b border-gray-800 transition-colors hover:bg-gray-800/30 ${
                        busy ? "opacity-60" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-gold/30 to-brand-crimson/30 flex items-center justify-center text-white font-bold text-xs shrink-0">
                            {u.full_name?.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-white truncate">
                              {u.full_name}
                            </div>
                            {u.vehicle && (
                              <div className="text-[10px] text-gray-500">
                                {u.vehicle}
                                {u.plate_number && ` · ${u.plate_number}`}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-300">{u.email}</div>
                        {u.phone && (
                          <div className="text-[10px] text-gray-500">
                            {u.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${ROLE_COLORS[u.role]}`}
                        >
                          <Shield className="w-3 h-3" />
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-300">
                        {u.branch_id ? branchName(u.branch_id) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                            u.is_active
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {u.is_active ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <button
                            onClick={() => openEdit(u)}
                            disabled={busy}
                            className="px-2 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white text-[10px] font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-600 flex items-center gap-1"
                          >
                            <Pencil className="w-3 h-3" />
                            Edit
                          </button>
                          <button
                            onClick={() => setResetUser(u)}
                            disabled={busy}
                            className="px-2 py-1 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 disabled:opacity-50 text-amber-400 text-[10px] font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/40 flex items-center gap-1"
                          >
                            <Key className="w-3 h-3" />
                            Reset
                          </button>
                          <button
                            onClick={() => toggleActive(u)}
                            disabled={busy || isSelf}
                            className="px-2 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 disabled:opacity-30 text-blue-400 text-[10px] font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40 flex items-center gap-1"
                          >
                            {u.is_active ? (
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
                            onClick={() => setDeleteTarget(u)}
                            disabled={busy || isSelf}
                            aria-label={`Delete ${u.full_name}`}
                            className="px-2 py-1 rounded-lg bg-red-600/20 hover:bg-red-600/30 disabled:opacity-30 text-red-400 text-[10px] font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <Modal
          onClose={() => setShowForm(false)}
          labelledBy="user-form-title"
          disableClose={saving}
        >
          <form onSubmit={handleSave} aria-busy={saving} className="p-6 space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-gray-700">
              <h3
                id="user-form-title"
                className="font-heading text-lg font-bold text-white"
              >
                {editing ? "Edit User" : "New User"}
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

            <Field label="Full Name">
              <input
                required
                disabled={saving}
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none disabled:opacity-60"
              />
            </Field>

            {!editing && (
              <>
                <Field label="Email">
                  <input
                    required
                    type="email"
                    disabled={saving}
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none disabled:opacity-60"
                  />
                </Field>

                <Field label="Password">
                  <div className="relative">
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      minLength={6}
                      disabled={saving}
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      className="w-full px-4 py-3 pr-12 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-2 my-auto w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold/40"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </Field>
              </>
            )}

            <Field label="Phone">
              <input
                disabled={saving}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="024XXXXXXX"
                className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none disabled:opacity-60"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Role">
                <select
                  disabled={saving}
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none disabled:opacity-60"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Branch">
                <select
                  disabled={saving}
                  value={form.branch_id}
                  onChange={(e) =>
                    setForm({ ...form, branch_id: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none disabled:opacity-60"
                >
                  <option value="">— All branches —</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {form.role === "rider" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Vehicle">
                  <input
                    disabled={saving}
                    value={form.vehicle}
                    onChange={(e) =>
                      setForm({ ...form, vehicle: e.target.value })
                    }
                    placeholder="Motorbike"
                    className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none disabled:opacity-60"
                  />
                </Field>
                <Field label="Plate Number">
                  <input
                    disabled={saving}
                    value={form.plate_number}
                    onChange={(e) =>
                      setForm({ ...form, plate_number: e.target.value })
                    }
                    placeholder="GT-1234-22"
                    className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none disabled:opacity-60"
                  />
                </Field>
              </div>
            )}

            {editing && (
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
                Active
              </label>
            )}

            <div className="flex gap-3 pt-4 border-t border-gray-700">
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
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-brand-gold hover:bg-brand-amber disabled:opacity-50 text-brand-dark font-extrabold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/60"
              >
                {saving
                  ? "Saving…"
                  : editing
                  ? "Save Changes"
                  : "Create User"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          onClose={() => (deleting ? null : setDeleteTarget(null))}
          labelledBy="delete-user-title"
          disableClose={deleting}
        >
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <h3
                id="delete-user-title"
                className="font-heading text-lg font-bold text-white"
              >
                Delete user?
              </h3>
            </div>
            <p className="text-sm text-gray-400">
              You're about to delete{" "}
              <span className="text-white font-bold">
                {deleteTarget.full_name}
              </span>
              . This cannot be undone.
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

      {resetUser && (
        <Modal
          onClose={() => (resetting ? null : setResetUser(null))}
          labelledBy="reset-pw-title"
          disableClose={resetting}
        >
          <form onSubmit={submitResetPassword} className="p-6 space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-gray-700">
              <h3
                id="reset-pw-title"
                className="font-heading text-lg font-bold text-white"
              >
                Reset password
              </h3>
              <button
                type="button"
                onClick={() => setResetUser(null)}
                disabled={resetting}
                aria-label="Close"
                className="text-gray-400 hover:text-white p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-400">
              Set a new password for{" "}
              <span className="text-white font-bold">
                {resetUser.full_name}
              </span>
              . They'll need this on their next login.
            </p>

            <Field label="New Password">
              <input
                required
                minLength={6}
                disabled={resetting}
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none disabled:opacity-60"
              />
            </Field>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setResetUser(null)}
                disabled={resetting}
                className="flex-1 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white font-bold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={resetting}
                className="flex-1 py-3 rounded-xl bg-brand-gold hover:bg-brand-amber disabled:opacity-50 text-brand-dark font-extrabold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/60"
              >
                {resetting ? "Resetting…" : "Reset"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <Toast toast={toast} />
    </div>
  );
}