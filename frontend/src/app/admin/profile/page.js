"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";

export default function AdminProfile() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [me, setMe] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMessage, setPwMessage] = useState("");
  const [pwError, setPwError] = useState("");

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
      const [meRes, branchesRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${t}` },
        }),
        fetch(`${API_URL}/api/v1/branches`, {
          headers: { Authorization: `Bearer ${t}` },
        }),
      ]);
      const meData = await meRes.json();
      setMe(meData);
      setFullName(meData.full_name || "");
      setPhone(meData.phone || "");
      setBranches(await branchesRes.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ full_name: fullName, phone: phone || null }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Save failed");
      }
      const updated = await res.json();
      setMe(updated);
      setMessage("Profile updated successfully");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setPwError("");
    setPwMessage("");

    if (newPassword !== confirmPassword) {
      setPwError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setPwError("Password must be at least 6 characters");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/me/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed");
      }
      setPwMessage("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwMessage(""), 3000);
    } catch (err) {
      setPwError(err.message);
    }
  }

  const branchName = (id) =>
    branches.find((b) => b.id === id)?.name || "All branches";

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="h-8 w-40 rounded bg-gray-700/60 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-extrabold text-white">
          My Profile
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Manage your login details and password.
        </p>
      </div>

      {/* Info banner */}
      <div className="bg-brand-card border border-gray-700 rounded-2xl p-5 mb-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-gold to-brand-crimson flex items-center justify-center text-brand-dark font-black text-xl">
          {me?.full_name?.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="font-bold text-white">{me?.full_name}</div>
          <div className="text-xs text-gray-400">{me?.email}</div>
          <div className="flex gap-2 mt-1">
            <span className="text-[10px] px-2 py-0.5 rounded bg-brand-gold/20 text-brand-gold font-bold uppercase">
              {me?.role}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-400 font-bold">
              {branchName(me?.branch_id)}
            </span>
          </div>
        </div>
      </div>

      {/* Profile edit */}
      <form
        onSubmit={saveProfile}
        className="bg-brand-card border border-gray-700 rounded-2xl p-6 space-y-4 mb-6"
      >
        <h2 className="font-heading text-lg font-bold text-white">
          Profile Information
        </h2>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {error}
          </div>
        )}
        {message && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
            {message}
          </div>
        )}

        <Field label="Full Name">
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm"
          />
        </Field>

        <Field label="Phone Number">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="024XXXXXXX"
            className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm"
          />
        </Field>

        <Field label="Email (cannot be changed)">
          <input
            disabled
            value={me?.email || ""}
            className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-gray-500 text-sm"
          />
        </Field>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-brand-gold text-brand-dark font-extrabold text-sm disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </form>

      {/* Password change */}
      <form
        onSubmit={changePassword}
        className="bg-brand-card border border-gray-700 rounded-2xl p-6 space-y-4"
      >
        <h2 className="font-heading text-lg font-bold text-white">
          Change Password
        </h2>

        {pwError && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {pwError}
          </div>
        )}
        {pwMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
            {pwMessage}
          </div>
        )}

        <Field label="Current Password">
          <input
            required
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm"
          />
        </Field>

        <Field label="New Password">
          <div className="relative">
            <input
              required
              minLength={6}
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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

        <Field label="Confirm New Password">
          <input
            required
            minLength={6}
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm"
          />
        </Field>

        <button
          type="submit"
          className="px-6 py-3 rounded-xl bg-brand-gold text-brand-dark font-extrabold text-sm"
        >
          Change Password
        </button>
      </form>
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