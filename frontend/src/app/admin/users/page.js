"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";
import { TableSkeleton } from "@/components/Skeleton";

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

export default function AdminUsers() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [resetPassword, setResetPassword] = useState("");

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
    const t = localStorage.getItem("mrf_token");
    if (!t) {
      router.push("/admin");
      return;
    }
    setToken(t);
    load(t);
  }, []);

  async function load(t) {
    setLoading(true);
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
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setForm(emptyForm);
    setEditing(null);
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
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();

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
      await load(token);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDelete(u) {
    if (!confirm(`Delete ${u.full_name}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/users/${u.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Delete failed");
      }
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } catch (err) {
      alert(err.message);
    }
  }

  async function toggleActive(u) {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/users/${u.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !u.is_active }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Toggle failed");
      }
      const updated = await res.json();
      setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch (err) {
      alert(err.message);
    }
  }

  async function submitResetPassword(e) {
    e.preventDefault();
    try {
      const res = await fetch(
        `${API_URL}/api/v1/auth/users/${resetUser.id}/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ new_password: resetPassword }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Reset failed");
      }
      setResetUser(null);
      setResetPassword("");
      alert("Password reset successfully");
    } catch (err) {
      alert(err.message);
    }
  }

  const visible = users.filter((u) => {
    if (filterRole !== "all" && u.role !== filterRole) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      return (
        u.full_name.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s) ||
        (u.phone && u.phone.includes(s))
      );
    }
    return true;
  });

  const branchName = (id) => branches.find((b) => b.id === id)?.name || "—";

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
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
          className="px-5 py-3 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-extrabold text-sm"
        >
          + New User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, phone…"
          className="flex-1 min-w-[200px] px-4 py-2.5 rounded-xl bg-brand-card border border-gray-700 text-white text-sm outline-none focus:border-brand-gold"
        />
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {[{ value: "all", label: "All" }, ...ROLES].map((r) => (
            <button
              key={r.value}
              onClick={() => setFilterRole(r.value)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                filterRole === r.value
                  ? "bg-brand-gold text-brand-dark"
                  : "bg-brand-card border border-gray-700 text-gray-300"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : visible.length === 0 ? (
        <div className="bg-brand-card border border-gray-700 rounded-2xl p-12 text-center">
          <p className="text-gray-400">No users match this filter.</p>
        </div>
      ) : (
        <div className="bg-brand-card border border-gray-700 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((u) => (
                  <tr key={u.id} className="border-b border-gray-800">
                    <td className="px-4 py-3">
                      <div className="font-bold text-white">{u.full_name}</div>
                      {u.vehicle && (
                        <div className="text-[10px] text-gray-500">
                          {u.vehicle}
                          {u.plate_number && ` · ${u.plate_number}`}
                        </div>
                      )}
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
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${ROLE_COLORS[u.role]}`}
                      >
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
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(u)}
                          className="px-2 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-[10px] font-bold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setResetUser(u)}
                          className="px-2 py-1 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 text-[10px] font-bold"
                        >
                          Reset PW
                        </button>
                        <button
                          onClick={() => toggleActive(u)}
                          disabled={u.id === me?.id}
                          className="px-2 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-[10px] font-bold disabled:opacity-30"
                        >
                          {u.is_active ? "Disable" : "Enable"}
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          disabled={u.id === me?.id}
                          className="px-2 py-1 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 text-[10px] font-bold disabled:opacity-30"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setShowForm(false)}
            className="absolute inset-0 bg-black/80"
          />
          <form
            onSubmit={handleSave}
            className="relative bg-brand-card border border-gray-700 rounded-3xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto space-y-4"
          >
            <div className="flex justify-between items-center pb-4 border-b border-gray-700">
              <h3 className="font-heading text-lg font-bold text-white">
                {editing ? "Edit User" : "New User"}
              </h3>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-gray-400"
              >
                ✕
              </button>
            </div>

            <Field label="Full Name">
              <input
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm"
              />
            </Field>

            {!editing && (
              <>
                <Field label="Email">
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm"
                  />
                </Field>

                <Field label="Password">
                  <div className="relative">
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      minLength={6}
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      className="w-full px-4 py-3 pr-12 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-2 my-auto w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white"
                    >
                      {showPassword ? "🙈" : "👁"}
                    </button>
                  </div>
                </Field>
              </>
            )}

            <Field label="Phone">
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="024XXXXXXX"
                className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Role">
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm"
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
                  value={form.branch_id}
                  onChange={(e) =>
                    setForm({ ...form, branch_id: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm"
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
                    value={form.vehicle}
                    onChange={(e) =>
                      setForm({ ...form, vehicle: e.target.value })
                    }
                    placeholder="Motorbike"
                    className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm"
                  />
                </Field>
                <Field label="Plate Number">
                  <input
                    value={form.plate_number}
                    onChange={(e) =>
                      setForm({ ...form, plate_number: e.target.value })
                    }
                    placeholder="GT-1234-22"
                    className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm"
                  />
                </Field>
              </div>
            )}

            {editing && (
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm({ ...form, is_active: e.target.checked })
                  }
                />
                Active
              </label>
            )}

            <div className="flex gap-3 pt-4 border-t border-gray-700">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 py-3 rounded-xl bg-gray-800 text-white font-bold text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-brand-gold text-brand-dark font-extrabold text-sm"
              >
                {editing ? "Save Changes" : "Create User"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reset password modal */}
      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setResetUser(null)}
            className="absolute inset-0 bg-black/80"
          />
          <form
            onSubmit={submitResetPassword}
            className="relative bg-brand-card border border-gray-700 rounded-3xl max-w-sm w-full p-6 space-y-4"
          >
            <h3 className="font-heading text-lg font-bold text-white">
              Reset password for {resetUser.full_name}
            </h3>
            <p className="text-xs text-gray-400">
              The user will need this new password on their next login.
            </p>

            <Field label="New Password">
              <input
                required
                minLength={6}
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm"
              />
            </Field>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setResetUser(null)}
                className="flex-1 py-3 rounded-xl bg-gray-800 text-white font-bold text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-brand-gold text-brand-dark font-extrabold text-sm"
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      )}
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