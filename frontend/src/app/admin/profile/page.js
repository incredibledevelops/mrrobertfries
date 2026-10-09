"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  Shield,
  Building2,
  Eye,
  EyeOff,
  Save,
  Key,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { API_URL } from "@/lib/api";

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
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    const t = getAdminToken();
    if (!t) {
      router.replace("/admin");
      return;
    }
    setToken(t);
    load(t);
  }, [router]);

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

    setChangingPw(true);
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
    } finally {
      setChangingPw(false);
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

      <div className="bg-brand-card border border-gray-700 rounded-2xl p-5 mb-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-gold to-brand-crimson flex items-center justify-center text-brand-dark font-black text-xl">
          {me?.full_name?.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="font-bold text-white flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            {me?.full_name}
          </div>
          <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
            <Mail className="w-3 h-3" />
            {me?.email}
          </div>
          <div className="flex gap-2 mt-1.5">
            <span className="text-[10px] px-2 py-0.5 rounded bg-brand-gold/20 text-brand-gold font-bold uppercase flex items-center gap-1">
              <Shield className="w-3 h-3" />
              {me?.role}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-400 font-bold flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {branchName(me?.branch_id)}
            </span>
          </div>
        </div>
      </div>

      <form
        onSubmit={saveProfile}
        className="bg-brand-card border border-gray-700 rounded-2xl p-6 space-y-4 mb-6"
      >
        <h2 className="font-heading text-lg font-bold text-white">
          Profile Information
        </h2>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}
        {message && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            {message}
          </div>
        )}

        <Field label="Full Name">
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none"
          />
        </Field>

        <Field label="Phone Number">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="024XXXXXXX"
            className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none"
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
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-extrabold text-sm disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </form>

      <form
        onSubmit={changePassword}
        className="bg-brand-card border border-gray-700 rounded-2xl p-6 space-y-4"
      >
        <h2 className="font-heading text-lg font-bold text-white flex items-center gap-2">
          <Key className="w-5 h-5 text-brand-gold" />
          Change Password
        </h2>

        {pwError && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {pwError}
          </div>
        )}
        {pwMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            {pwMessage}
          </div>
        )}

        <Field label="Current Password">
          <input
            required
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none"
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
              className="w-full px-4 py-3 pr-12 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-2 my-auto w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold/40"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
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
            className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none"
          />
        </Field>

        <button
          type="submit"
          disabled={changingPw}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-extrabold text-sm disabled:opacity-50 transition-colors"
        >
          <Key className="w-4 h-4" />
          {changingPw ? "Changing…" : "Change Password"}
        </button>
      </form>
    </div>
  );
}