"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";
import { TableSkeleton } from "@/components/Skeleton";

export default function AdminZones() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [zones, setZones] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterBranch, setFilterBranch] = useState("all");
  const [orphanCount, setOrphanCount] = useState(0);
  const [fixing, setFixing] = useState(false);

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
    const t = localStorage.getItem("mrf_token");
    if (!t) {
      router.push("/admin");
      return;
    }
    setToken(t);
    loadAll(t);
  }, []);

  async function loadAll(t) {
    setLoading(true);
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

      // Default the form to the default branch (or first)
      const defaultBranch = branchList.find((b) => b.is_default) || branchList[0];
      if (defaultBranch && !form.branch_id) {
        setForm((f) => ({ ...f, branch_id: defaultBranch.id }));
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    const defaultBranch =
      branches.find((b) => b.is_default) || branches[0];
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
      await loadAll(token);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDelete(zone) {
    if (!confirm(`Delete "${zone.name}"?`)) return;
    try {
      const res = await fetch(
        `${API_URL}/api/v1/delivery-zones/${zone.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error("Delete failed");
      setZones((prev) => prev.filter((z) => z.id !== zone.id));
    } catch (err) {
      alert(err.message);
    }
  }

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
    } catch (err) {
      alert(err.message);
    }
  }

  async function fixOrphans() {
    if (branches.length === 0) return alert("Create a branch first");
    const defaultBranch =
      branches.find((b) => b.is_default) || branches[0];
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
      alert(data.message);
      await loadAll(token);
    } catch (err) {
      alert(err.message);
    } finally {
      setFixing(false);
    }
  }

  // Filter the zones list
  const visibleZones =
    filterBranch === "all"
      ? zones
      : filterBranch === "shared"
      ? zones.filter((z) => !z.branch_id)
      : zones.filter((z) => z.branch_id === filterBranch);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-white">
            Delivery Zones
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Each zone belongs to a branch. Customers only see zones for the
            branch they're ordering from.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-5 py-3 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-extrabold text-sm"
        >
          + New Zone
        </button>
      </div>

      {/* Orphan warning */}
      {orphanCount > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-amber-300">
            ⚠️ <strong>{orphanCount} zone(s)</strong> aren't linked to any
            branch — they appear in every branch's checkout.
          </div>
          <button
            onClick={fixOrphans}
            disabled={fixing}
            className="px-4 py-2 rounded-xl bg-brand-gold text-brand-dark text-xs font-extrabold disabled:opacity-50"
          >
            {fixing ? "Fixing…" : "Auto-link to default branch"}
          </button>
        </div>
      )}

      {/* Branch filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
        <button
          onClick={() => setFilterBranch("all")}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${
            filterBranch === "all"
              ? "bg-brand-gold text-brand-dark"
              : "bg-brand-card border border-gray-700 text-gray-300"
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
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${
                filterBranch === b.id
                  ? "bg-brand-gold text-brand-dark"
                  : "bg-brand-card border border-gray-700 text-gray-300"
              }`}
            >
              📍 {b.name} ({count})
            </button>
          );
        })}
        <button
          onClick={() => setFilterBranch("shared")}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${
            filterBranch === "shared"
              ? "bg-brand-gold text-brand-dark"
              : "bg-brand-card border border-gray-700 text-gray-300"
          }`}
        >
          🌍 Shared ({zones.filter((z) => !z.branch_id).length})
        </button>
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : visibleZones.length === 0 ? (
        <div className="bg-brand-card border border-gray-700 rounded-2xl p-12 text-center">
          <p className="text-gray-400">No zones match this filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleZones.map((zone) => (
            <div
              key={zone.id}
              className="p-5 bg-brand-card border border-gray-700 rounded-2xl flex flex-col"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <div className="font-bold text-white truncate">
                    📍 {zone.name}
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

              {/* Branch badge */}
              <div className="mb-3">
                {zone.branch_id ? (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-brand-gold/15 text-brand-gold font-bold border border-brand-gold/30">
                    🏢 {zone.branch_name || "Unknown branch"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-blue-500/15 text-blue-400 font-bold border border-blue-500/30">
                    🌍 Shared — visible in all branches
                  </span>
                )}
              </div>

              <div className="space-y-1 text-sm mb-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Fee:</span>
                  <span className="text-emerald-400 font-bold">
                    GH₵ {zone.delivery_fee.toFixed(2)}
                  </span>
                </div>
                {zone.estimated_minutes && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Est. time:</span>
                    <span className="text-white font-bold">
                      {zone.estimated_minutes} min
                    </span>
                  </div>
                )}
              </div>

              {/* Quick branch reassignment (only when multiple branches exist) */}
              {branches.length > 1 && (
                <div className="mb-3">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                    Reassign to branch
                  </label>
                  <select
                    value={zone.branch_id || "shared"}
                    onChange={(e) => quickAssign(zone, e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-gray-700 text-white text-xs"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                    <option value="shared">🌍 Shared (all branches)</option>
                  </select>
                </div>
              )}

              <div className="mt-auto flex gap-2 pt-3 border-t border-gray-800">
                <button
                  onClick={() => openEdit(zone)}
                  className="flex-1 py-2 rounded-lg bg-gray-800 text-white text-xs font-bold"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(zone)}
                  className="px-3 py-2 rounded-lg bg-red-600/20 text-red-400 text-xs font-bold"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
                {editing ? "Edit Zone" : "New Delivery Zone"}
              </h3>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-gray-400"
              >
                ✕
              </button>
            </div>

            {/* Branch selector — FIRST field so it's obvious */}
            <Field label="Branch (this zone belongs to which kitchen?)">
              <select
                required
                value={form.branch_id}
                onChange={(e) =>
                  setForm({ ...form, branch_id: e.target.value })
                }
                className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm"
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

            <Field label="Zone Name">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. UG Legon Campus"
                className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm"
              />
            </Field>

            <Field label="Description">
              <input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Landmarks / area covered"
                className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Delivery Fee (GH₵)">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.delivery_fee}
                  onChange={(e) =>
                    setForm({ ...form, delivery_fee: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm"
                />
              </Field>
              <Field label="Estimated Minutes">
                <input
                  type="number"
                  min="0"
                  value={form.estimated_minutes}
                  onChange={(e) =>
                    setForm({ ...form, estimated_minutes: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm"
                />
              </Field>
            </div>

            <Field label="Display Order">
              <input
                type="number"
                value={form.display_order}
                onChange={(e) =>
                  setForm({ ...form, display_order: e.target.value })
                }
                className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm"
              />
            </Field>

            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
              />
              Active (customers can select this zone)
            </label>

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
                {editing ? "Save Changes" : "Create Zone"}
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