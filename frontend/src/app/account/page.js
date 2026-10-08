"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { API_URL } from "@/lib/api";
import {
  saveCustomerTokens,
  getCustomerToken,
  clearCustomerTokens,
  customerFetch,
} from "@/lib/customerAuth";
import SearchBar from "@/components/SearchBar";
import { SkeletonLine, SkeletonBlock } from "@/components/Skeleton";

/* ------------------------------------------------------------------ */
/*  constants                                                          */
/* ------------------------------------------------------------------ */

export const TABS = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "My Orders" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/favorites", label: "Favorites" },
  { href: "/account/referrals", label: "Referrals" },
];

// 1 point = GH₵ 0.01 (match this to your backend)
const POINT_VALUE = 0.01;
const NEXT_MILESTONE = 1000; // points needed for the next reward tier
const RESEND_COOLDOWN = 30; // seconds
const IS_DEV = process.env.NODE_ENV !== "production";

/* ------------------------------------------------------------------ */
/*  helpers                                                            */
/* ------------------------------------------------------------------ */

function ghs(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "GH₵ 0.00";
  return `GH₵ ${n.toFixed(2)}`;
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

// Ghanaian mobile: accept 024/054/055/059/020/050 etc., 10 digits,
// or international +233XXXXXXXXX. Returns normalized "0XXXXXXXXX" or null.
function normalizePhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10 && digits.startsWith("0")) return digits;
  if (digits.length === 12 && digits.startsWith("233"))
    return "0" + digits.slice(3);
  if (digits.length === 9) return "0" + digits;
  return null;
}

function isValidPhone(raw) {
  return !!normalizePhone(raw);
}

/* ------------------------------------------------------------------ */
/*  main component                                                     */
/* ------------------------------------------------------------------ */

export default function AccountPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // auth state
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState("phone"); // "phone" | "code"
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [devCode, setDevCode] = useState(null);
  const [resendIn, setResendIn] = useState(0);

  // UI state
  const [referralCopied, setReferralCopied] = useState(false);
  const [toast, setToast] = useState(null); // { message, type }
  const [confirmLogout, setConfirmLogout] = useState(false);

  const toastTimer = useRef(null);
  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);
  useEffect(
    () => () => toastTimer.current && clearTimeout(toastTimer.current),
    []
  );

  /* ---------- load profile ---------- */
  useEffect(() => {
    const token = getCustomerToken();
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");

    (async () => {
      try {
        const res = await customerFetch(
          `${API_URL}/api/v1/customer-account/me`
        );
        if (res.status === 401) {
          clearCustomerTokens();
          if (!cancelled) {
            setLoggedIn(false);
            setProfile(null);
          }
          return;
        }
        if (!res.ok) throw new Error("Failed to load your profile.");
        const data = await readJson(res);
        if (cancelled) return;
        setProfile(data);
        setLoggedIn(true);
      } catch (e) {
        if (!cancelled) setError(e.message || "Something went wrong.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  /* ---------- resend cooldown ticker ---------- */
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => {
      setResendIn((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  /* ---------- request OTP ---------- */
  const requestOTP = useCallback(
    async (e) => {
      e?.preventDefault?.();
      setAuthError("");

      const normalized = normalizePhone(phone);
      if (!normalized) {
        setAuthError("Enter a valid Ghanaian phone number (e.g. 024XXXXXXX).");
        return;
      }

      setAuthLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/v1/customer-auth/request-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: normalized,
            full_name: fullName.trim() || "Customer",
          }),
        });
        const data = await readJson(res);
        if (!res.ok)
          throw new Error(
            data.detail || "Couldn't send the code. Please try again."
          );

        setPhone(normalized);
        setStage("code");
        setResendIn(RESEND_COOLDOWN);

        // Only expose dev code in non-production builds
        if (IS_DEV && data.message?.startsWith("DEV MODE")) {
          const m = String(data.message).match(/(\d{4,8})/);
          setDevCode(m ? m[1] : null);
        } else {
          setDevCode(null);
        }
      } catch (err) {
        setAuthError(err.message);
      } finally {
        setAuthLoading(false);
      }
    },
    [phone, fullName]
  );

  /* ---------- verify OTP ---------- */
  const verifyOTP = useCallback(
    async (e) => {
      e?.preventDefault?.();
      setAuthError("");
      if (code.length < 4) {
        setAuthError("Enter the code we sent you.");
        return;
      }
      setAuthLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/v1/customer-auth/verify-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: phone.trim(), code: code.trim() }),
        });
        const data = await readJson(res);
        if (!res.ok) throw new Error(data.detail || "Invalid code.");

        saveCustomerTokens(data.access_token, data.refresh_token);
        const meRes = await customerFetch(
          `${API_URL}/api/v1/customer-account/me`
        );
        const me = await readJson(meRes);
        setProfile(me);
        setLoggedIn(true);
        showToast("Welcome back! 👋");
      } catch (err) {
        setAuthError(err.message);
      } finally {
        setAuthLoading(false);
      }
    },
    [phone, code, showToast]
  );

  /* ---------- logout ---------- */
  const doLogout = useCallback(() => {
    clearCustomerTokens();
    setLoggedIn(false);
    setProfile(null);
    setStage("phone");
    setPhone("");
    setCode("");
    setFullName("");
    setConfirmLogout(false);
    showToast("Signed out.");
  }, [showToast]);

  /* ---------- search ---------- */
  const openSearch = useCallback(() => {
    if (typeof window !== "undefined" && window.__openSearch) {
      window.__openSearch();
    }
  }, []);

  /* ---------- referral helpers ---------- */
  const copyReferral = useCallback(async () => {
    if (!profile?.referral_code) return;
    const text = profile.referral_code;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setReferralCopied(true);
      showToast("Referral code copied!");
      setTimeout(() => setReferralCopied(false), 2000);
    } catch {
      showToast("Couldn't copy — long-press to select.", "error");
    }
  }, [profile?.referral_code, showToast]);

  const shareReferral = useCallback(async () => {
    if (!profile?.referral_code) return;
    const shareText = `Try Mr. Robert's Fries 🍟 — Ghana's best loaded fries! Use my code ${profile.referral_code} for GH₵ 10 off your first order: https://mrfries.com`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Mr. Robert's Fries",
          text: shareText,
        });
        return;
      } catch {
        // user cancelled — silently fall through to copy
      }
    }
    await copyReferral();
  }, [profile?.referral_code, copyReferral]);

  const shareViaWhatsApp = useCallback(() => {
    if (!profile?.referral_code) return;
    const text = encodeURIComponent(
      `Try Mr. Robert's Fries 🍟 — Ghana's best loaded fries! Use my code ${profile.referral_code} for GH₵ 10 off: https://mrfries.com`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener");
  }, [profile?.referral_code]);

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */

  /* ---------- Loading ---------- */
  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark text-gray-100">
        <div className="border-b border-gray-800 bg-brand-card/50">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
            <SkeletonBlock className="w-10 h-10 rounded-xl" />
            <SkeletonLine className="h-6 w-40" />
          </div>
        </div>
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <SkeletonBlock className="h-48" />
          <SkeletonBlock className="h-32" />
          <div className="grid grid-cols-2 gap-4">
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Login / OTP ---------- */
  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-brand-card border border-gray-700 rounded-3xl p-8 space-y-5">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-gold to-brand-crimson flex items-center justify-center text-brand-dark font-black text-2xl mx-auto">
              🍟
            </div>
            <h1 className="font-heading text-2xl font-extrabold text-white mt-4">
              My Account
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              {stage === "phone"
                ? "Sign in with your phone number"
                : "Enter the code we sent you"}
            </p>
          </div>

          {authError && (
            <div
              role="alert"
              aria-live="assertive"
              className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs"
            >
              {authError}
            </div>
          )}

          {stage === "phone" ? (
            <form onSubmit={requestOTP} className="space-y-4" aria-busy={authLoading}>
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-xs font-bold text-gray-300 mb-1"
                >
                  Full Name
                </label>
                <input
                  id="fullName"
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Kwadwo Mensah"
                  className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm focus:border-brand-gold outline-none focus:ring-2 focus:ring-brand-gold/40 transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block text-xs font-bold text-gray-300 mb-1"
                >
                  Phone Number
                </label>
                <input
                  id="phone"
                  required
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="024XXXXXXX"
                  className={`w-full px-4 py-3 rounded-xl bg-brand-dark border text-white text-sm outline-none focus:ring-2 focus:ring-brand-gold/40 transition-colors ${
                    phone && !isValidPhone(phone)
                      ? "border-red-500/60"
                      : "border-gray-700 focus:border-brand-gold"
                  }`}
                />
                {phone && !isValidPhone(phone) && (
                  <p className="text-[11px] text-red-400 mt-1">
                    Enter a valid Ghanaian number (e.g. 024XXXXXXX)
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={authLoading || !isValidPhone(phone)}
                className="w-full py-3 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-extrabold disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/60"
              >
                {authLoading ? "Sending code…" : "Send Login Code →"}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOTP} className="space-y-4" aria-busy={authLoading}>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                Code sent to <strong>{phone}</strong>
                {IS_DEV && devCode && (
                  <span className="block mt-1 text-brand-gold">
                    DEV MODE: use{" "}
                    <span className="font-mono">{devCode}</span>
                  </span>
                )}
              </div>

              <OtpInput
                value={code}
                onChange={setCode}
                onComplete={() => {
                  // auto-submit when 6 digits entered
                  if (code.length === 6) {
                    // microtask so state flushes
                    setTimeout(() => verifyOTP(), 0);
                  }
                }}
              />

              <button
                type="submit"
                disabled={authLoading || code.length < 4}
                className="w-full py-3 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-extrabold disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/60"
              >
                {authLoading ? "Verifying…" : "Verify & Sign In"}
              </button>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setStage("phone");
                    setCode("");
                    setAuthError("");
                    setDevCode(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  ← Change number
                </button>
                <button
                  type="button"
                  onClick={requestOTP}
                  disabled={authLoading || resendIn > 0}
                  className="text-brand-gold hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                </button>
              </div>
            </form>
          )}

          <Link
            href="/"
            className="block text-center text-xs text-gray-400 hover:text-brand-gold"
          >
            ← Back to menu
          </Link>
        </div>

        <Toast toast={toast} />
      </div>
    );
  }

  /* ---------- Dashboard ---------- */
  const points = safeNumber(profile?.loyalty_points);
  const pointsCash = points * POINT_VALUE;
  const totalOrders = safeNumber(profile?.total_orders);
  const totalSpent = safeNumber(profile?.total_spent);
  const lifetimeEarned = safeNumber(profile?.lifetime_points_earned);
  const firstName = (profile?.full_name || "").trim().split(/\s+/)[0] || "there";
  const progressPct = Math.min(100, (points / NEXT_MILESTONE) * 100);

  return (
    <div className="min-h-screen bg-brand-dark text-gray-100">
      <AccountHeader
        profile={profile}
        onLogout={() => setConfirmLogout(true)}
        activeTab="/account"
        onSearch={openSearch}
      />

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {error && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-3"
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

        {/* Greeting */}
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-white">
            Hi, {firstName} 👋
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Welcome back to Mr. Robert's Fries.
          </p>
        </div>

        {/* Loyalty card */}
        <div className="bg-gradient-to-br from-brand-card via-brand-card to-gray-900 border border-gray-700 rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="text-xs text-brand-gold uppercase tracking-widest font-bold">
                🎁 Loyalty Balance
              </div>
              <div className="flex items-baseline gap-2 mt-3">
                <span className="text-5xl font-black text-white leading-none">
                  {points}
                </span>
                <span className="text-brand-gold text-sm font-bold">
                  points
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-2">
                Worth ≈{" "}
                <span className="text-emerald-400 font-bold">
                  {ghs(pointsCash)}
                </span>{" "}
                off your next order
              </div>

              {/* Progress to next milestone — always shown */}
              <div className="mt-4">
                <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                  <span>Next milestone ({NEXT_MILESTONE} pts)</span>
                  <span>
                    {points >= NEXT_MILESTONE
                      ? "Unlocked! 🎉"
                      : `${NEXT_MILESTONE - points} to go`}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={NEXT_MILESTONE}
                  aria-valuenow={Math.min(points, NEXT_MILESTONE)}
                  aria-label="Progress to next reward milestone"
                  className="h-1.5 rounded-full bg-gray-800 overflow-hidden"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-amber to-brand-gold transition-all duration-500 motion-reduce:transition-none"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="text-5xl shrink-0" aria-hidden="true">
              🎁
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-800 grid grid-cols-3 gap-4 text-sm">
            <Stat label="Orders" value={totalOrders} />
            <Stat label="Total Spent" value={ghs(totalSpent)} accent="gold" />
            <Stat
              label="Lifetime Earned"
              value={lifetimeEarned}
              accent="emerald"
            />
          </div>
        </div>

        {/* Referral card */}
        {profile?.referral_code && (
          <div className="bg-brand-card border border-gray-700 rounded-3xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">
                  🎉 Refer a Friend
                </div>
                <div className="text-lg font-bold text-white mt-2">
                  Give GH₵ 10, Get GH₵ 10
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Share your code. When they order, you both get rewarded.
                </div>
              </div>
              <div className="text-3xl shrink-0" aria-hidden="true">
                🎉
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <div
                className="flex-1 px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 font-mono text-brand-gold font-bold text-center tracking-wider select-all"
                aria-label="Your referral code"
              >
                {profile.referral_code}
              </div>
              <button
                onClick={copyReferral}
                aria-live="polite"
                className={`px-4 py-3 rounded-xl font-extrabold text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/50 ${
                  referralCopied
                    ? "bg-emerald-500 text-white"
                    : "bg-brand-gold text-brand-dark hover:bg-brand-amber"
                }`}
              >
                {referralCopied ? "✓ Copied" : "Copy"}
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={shareReferral}
                className="py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-gray-600"
              >
                📤 Share
              </button>
              <button
                onClick={shareViaWhatsApp}
                className="py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                💬 WhatsApp
              </button>
            </div>
          </div>
        )}

        {/* Quick links */}
        <div>
          <h2 className="font-heading text-lg font-bold text-white mb-3">
            Quick Links
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <QuickLink
              href="/account/orders"
              emoji="📦"
              label="My Orders"
              sub="Track & reorder"
            />
            <QuickLink
              href="/account/addresses"
              emoji="📍"
              label="Addresses"
              sub="Faster checkout"
            />
            <QuickLink
              href="/account/favorites"
              emoji="❤️"
              label="Favorites"
              sub="Your top picks"
            />
            <QuickLink
              href="/account/referrals"
              emoji="🎁"
              label="Referrals"
              sub="Track your invites"
            />
          </div>
        </div>

        {/* Order CTA */}
        <Link
          href="/#menu"
          className="block bg-gradient-to-r from-brand-amber to-brand-crimson hover:from-brand-gold hover:to-brand-amber rounded-3xl p-6 text-center transition-colors group focus:outline-none focus:ring-2 focus:ring-brand-gold/60"
        >
          <div className="text-3xl mb-2 group-hover:scale-110 transition-transform inline-block motion-reduce:transform-none">
            🍟
          </div>
          <div className="font-heading text-xl font-black text-white">
            Hungry? Order again
          </div>
          <div className="text-xs text-white/80 mt-1">
            Fresh loaded fries ready in 15 minutes
          </div>
        </Link>
      </main>

      {/* Logout confirm */}
      {confirmLogout && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={() => setConfirmLogout(false)}
            className="absolute inset-0 bg-black/70"
          />
          <div className="relative bg-brand-card border border-gray-700 rounded-3xl max-w-sm w-full p-6 space-y-4">
            <h3
              id="logout-title"
              className="font-heading text-lg font-bold text-white"
            >
              Sign out?
            </h3>
            <p className="text-xs text-gray-400">
              You'll need to verify your phone number again to sign back in.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmLogout(false)}
                className="flex-1 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={doLogout}
                className="flex-1 py-3 rounded-xl bg-brand-crimson hover:bg-red-700 text-white font-bold text-sm"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  small components                                                   */
/* ------------------------------------------------------------------ */

function Stat({ label, value, accent }) {
  const color =
    accent === "gold"
      ? "text-brand-gold"
      : accent === "emerald"
      ? "text-emerald-400"
      : "text-white";
  return (
    <div>
      <div className="text-gray-400 text-[10px] uppercase tracking-wider font-bold">
        {label}
      </div>
      <div className={`font-black text-xl mt-0.5 ${color}`}>{value}</div>
    </div>
  );
}

function QuickLink({ href, emoji, label, sub }) {
  return (
    <Link
      href={href}
      className="p-5 rounded-2xl bg-brand-card border border-gray-700 hover:border-brand-gold hover:bg-brand-card/80 transition-all group focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
    >
      <div className="text-2xl mb-2 group-hover:scale-110 transition-transform inline-block motion-reduce:transform-none">
        {emoji}
      </div>
      <div className="font-bold text-white">{label}</div>
      <div className="text-xs text-gray-400 mt-1">{sub}</div>
    </Link>
  );
}

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

/* 6-digit OTP input with paste, auto-advance, backspace nav */
function OtpInput({ value, onChange, onComplete, length = 6 }) {
  const refs = useRef([]);

  const setAt = (i, char) => {
    const chars = value.split("");
    chars[i] = char;
    const next = chars.join("").slice(0, length);
    onChange(next);
  };

  const handleChange = (i, e) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setAt(i, "");
      return;
    }
    if (raw.length > 1) {
      // paste-style input into a single box
      const chars = raw.split("").slice(0, length - i);
      const arr = value.padEnd(length, " ").split("");
      chars.forEach((c, j) => (arr[i + j] = c));
      const next = arr.join("").replace(/\s/g, "").slice(0, length);
      onChange(next);
      const focusIdx = Math.min(i + chars.length, length - 1);
      refs.current[focusIdx]?.focus();
      if (next.length === length) onComplete?.(next);
      return;
    }
    setAt(i, raw);
    if (i < length - 1) refs.current[i + 1]?.focus();
    const nextVal = (value.slice(0, i) + raw + value.slice(i + 1)).slice(
      0,
      length
    );
    if (nextVal.length === length) onComplete?.(nextVal);
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace") {
      if (value[i]) {
        setAt(i, "");
      } else if (i > 0) {
        refs.current[i - 1]?.focus();
        setAt(i - 1, "");
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && i > 0) {
      refs.current[i - 1]?.focus();
      e.preventDefault();
    } else if (e.key === "ArrowRight" && i < length - 1) {
      refs.current[i + 1]?.focus();
      e.preventDefault();
    }
  };

  const handlePaste = (i, e) => {
    const text = e.clipboardData?.getData("text")?.replace(/\D/g, "");
    if (!text) return;
    e.preventDefault();
    const chars = text.slice(0, length).split("");
    const next = chars.join("");
    onChange(next);
    const focusIdx = Math.min(chars.length, length - 1);
    refs.current[focusIdx]?.focus();
    if (next.length === length) onComplete?.(next);
  };

  return (
    <div>
      <label
        htmlFor="otp-0"
        className="block text-xs font-bold text-gray-300 mb-1"
      >
        6-Digit Code
      </label>
      <div className="flex gap-2 justify-between" role="group" aria-label="Verification code">
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            id={`otp-${i}`}
            ref={(el) => (refs.current[i] = el)}
            value={value[i] || ""}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={(e) => handlePaste(i, e)}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            autoFocus={i === 0}
            aria-label={`Digit ${i + 1}`}
            className="w-11 h-14 rounded-xl bg-brand-dark border border-gray-700 text-white text-2xl font-mono text-center focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40 outline-none transition-colors"
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  header                                                             */
/* ------------------------------------------------------------------ */

export function AccountHeader({ profile, onLogout, activeTab, onSearch }) {
  return (
    <div className="border-b border-gray-800 bg-brand-card/50 backdrop-blur sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="flex items-center gap-3 shrink-0 focus:outline-none focus:ring-2 focus:ring-brand-gold/40 rounded-xl"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-gold to-brand-crimson flex items-center justify-center text-brand-dark font-black">
            MR
          </div>
          <div className="hidden sm:block">
            <div className="font-heading text-lg font-black text-white leading-none">
              My Account
            </div>
            {profile && (
              <div className="text-[10px] text-gray-400 truncate max-w-[180px]">
                {profile.full_name} · {profile.phone}
              </div>
            )}
          </div>
        </Link>

        <div className="flex-1 max-w-xs mx-auto hidden md:block">
          {onSearch && <SearchBar onClick={onSearch} />}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="md:hidden">
            {onSearch && <SearchBar onClick={onSearch} compact />}
          </div>
          <Link
            href="/"
            className="hidden sm:block px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-200 transition-colors"
          >
            Menu
          </Link>
          <button
            onClick={onLogout}
            aria-label="Sign out"
            className="px-3 py-2 rounded-xl bg-brand-crimson hover:bg-red-700 text-white text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 flex gap-1 overflow-x-auto no-scrollbar">
        {TABS.map((t) => {
          const active = activeTab === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors focus:outline-none ${
                active
                  ? "border-brand-gold text-brand-gold"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}