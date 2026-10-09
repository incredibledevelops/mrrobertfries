"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Gift,
  PartyPopper,
  Share2,
  MessageCircle,
  Copy,
  Check,
  Clock,
  XCircle,
  Trophy,
  Users,
  Wallet,
  ArrowLeft,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { API_URL } from "@/lib/api";
import {
  getCustomerToken,
  clearCustomerTokens,
  customerFetch,
} from "@/lib/customerAuth";
import { AccountHeader } from "../page";
import { SkeletonBlock, SkeletonLine } from "@/components/Skeleton";

const CODE_REGEX = /^MRF-[A-Z0-9]{4,8}$/;
const REFERRAL_REWARD_GHS = 10;

const STATUS_META = {
  completed: { label: "Completed", color: "text-emerald-400", bg: "bg-emerald-500/15", Icon: PartyPopper },
  pending: { label: "Pending", color: "text-amber-400", bg: "bg-amber-500/15", Icon: Clock },
  expired: { label: "Expired", color: "text-gray-400", bg: "bg-gray-500/15", Icon: XCircle },
  rejected: { label: "Rejected", color: "text-red-400", bg: "bg-red-500/15", Icon: XCircle },
};

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatGHS(value) {
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

function formatDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
}

function Toast({ toast }) {
  if (!toast) return null;
  const styles = toast.type === "error"
    ? "bg-red-950/90 border-red-700 text-red-200"
    : "bg-emerald-950/90 border-emerald-700 text-emerald-200";
  return (
    <div role="status" aria-live="polite" className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-xl border text-sm font-semibold shadow-lg backdrop-blur ${styles}`}>
      {toast.message}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  const color = accent === "emerald" ? "text-emerald-400" : accent === "gold" ? "text-brand-gold" : "text-white";
  return (
    <div className="bg-brand-card border border-gray-700 rounded-2xl p-4">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center shrink-0">
          <Icon className="w-3.5 h-3.5 text-brand-gold" />
        </div>
        <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">{label}</div>
      </div>
      <div className={`text-2xl font-black mt-2 ${color}`}>{value}</div>
    </div>
  );
}

function StatusPill({ status }) {
  const meta = STATUS_META[status] || { label: status || "Unknown", color: "text-gray-300", bg: "bg-gray-500/15", Icon: Clock };
  const Icon = meta.Icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${meta.color} ${meta.bg}`}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
}

function ReferralsSkeleton({ count = 3 }) {
  return (
    <div role="status" className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-brand-card border border-gray-700 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            <SkeletonLine className="h-3 w-24" />
            <SkeletonLine className="h-4 w-40" />
          </div>
          <SkeletonBlock className="h-6 w-20 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export default function MyReferralsPage() {
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [summary, setSummary] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [applyMessage, setApplyMessage] = useState("");
  const [applyError, setApplyError] = useState("");
  const [copied, setCopied] = useState(false);

  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);
  useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), []);

  const load = useCallback(async (signal) => {
    try {
      const [meRes, refsRes, sumRes] = await Promise.all([
        customerFetch(`${API_URL}/api/v1/customer-account/me`),
        customerFetch(`${API_URL}/api/v1/referrals/me`),
        customerFetch(`${API_URL}/api/v1/referrals/me/summary`),
      ]);

      if (meRes.status === 401 || refsRes.status === 401 || sumRes.status === 401) {
        clearCustomerTokens();
        router.replace("/account");
        return;
      }
      if (!meRes.ok || !refsRes.ok || !sumRes.ok) {
        throw new Error("Couldn't load your referrals.");
      }

      const [me, refs, sum] = await Promise.all([readJson(meRes), readJson(refsRes), readJson(sumRes)]);
      if (signal?.aborted) return;

      setProfile(me);
      setReferrals(Array.isArray(refs) ? refs : []);
      setSummary(sum || null);
      setError("");
    } catch (e) {
      if (signal?.aborted) return;
      setError(e.message || "Something went wrong.");
    }
  }, [router]);

  useEffect(() => {
    if (!getCustomerToken()) {
      router.replace("/account");
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    (async () => {
      await load(controller.signal);
      if (!controller.signal.aborted) setLoading(false);
    })();
    return () => controller.abort();
  }, [load, reloadKey, router]);

  useEffect(() => {
    function onStorage(e) {
      if (e.key?.startsWith("mrf_customer") && !getCustomerToken()) {
        router.replace("/account");
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [router]);

  const logout = useCallback(() => {
    clearCustomerTokens();
    router.push("/account");
  }, [router]);

  const myPending = useMemo(() => referrals.find((r) => r.status === "pending"), [referrals]);
  const myActiveCode = myPending?.code || profile?.referral_code || "";
  const hasActiveCode = !!myActiveCode;

  const totals = useMemo(
    () => ({
      total: safeNumber(summary?.total_referrals),
      completed: safeNumber(summary?.completed_referrals),
      earned: safeNumber(summary?.total_earned),
    }),
    [summary]
  );

  const isCodeValid = CODE_REGEX.test(codeInput.trim().toUpperCase());

  const generate = useCallback(async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const res = await customerFetch(`${API_URL}/api/v1/referrals/me/generate`, { method: "POST" });
      if (res.status === 401) {
        clearCustomerTokens();
        router.replace("/account");
        return;
      }
      if (!res.ok) throw new Error("Couldn't generate a code.");
      const ref = await readJson(res);
      await load();
      const ok = await copyToClipboard(ref.code);
      showToast(ok ? `Code ${ref.code} ready & copied!` : `Code ${ref.code} ready!`);
    } catch (e) {
      showToast(e.message || "Couldn't generate code.", "error");
    } finally {
      setGenerating(false);
    }
  }, [generating, load, router, showToast]);

  const copyCode = useCallback(async () => {
    if (!myActiveCode) return;
    const ok = await copyToClipboard(myActiveCode);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    showToast(ok ? "Code copied!" : "Couldn't copy — long-press to select.", ok ? "success" : "error");
  }, [myActiveCode, showToast]);

  const shareText = useMemo(
    () => `Try Mr. Robert's Fries 🍟 — Ghana's best loaded fries! Use my code ${myActiveCode} for GH₵ ${REFERRAL_REWARD_GHS} off your first order: https://mrfries.com`,
    [myActiveCode]
  );

  const share = useCallback(async () => {
    if (!hasActiveCode) {
      await generate();
      return;
    }
    setSharing(true);
    try {
      if (navigator.share) {
        try {
          await navigator.share({ title: "Mr. Robert's Fries", text: shareText });
        } catch {}
      } else {
        const ok = await copyToClipboard(shareText);
        showToast(ok ? "Invite copied to clipboard!" : "Couldn't copy.", ok ? "success" : "error");
      }
    } finally {
      setSharing(false);
    }
  }, [hasActiveCode, generate, shareText, showToast]);

  const shareWhatsApp = useCallback(() => {
    if (!myActiveCode) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener");
  }, [myActiveCode, shareText]);

  const applyCode = useCallback(
    async (e) => {
      e.preventDefault();
      setApplyError("");
      setApplyMessage("");
      if (!profile) return;
      if (!isCodeValid) {
        setApplyError("Enter a valid code like MRF-AB123.");
        return;
      }

      setApplying(true);
      try {
        const res = await customerFetch(`${API_URL}/api/v1/referrals/apply`, {
          method: "POST",
          body: JSON.stringify({
            code: codeInput.trim().toUpperCase(),
            referee_phone: profile.phone,
            referee_name: profile.full_name,
          }),
        });
        if (res.status === 401) {
          clearCustomerTokens();
          router.replace("/account");
          return;
        }
        const data = await readJson(res);
        if (!res.ok) throw new Error(data.detail || "Couldn't apply that code.");
        setApplyMessage(data.message || "Code applied! Reward lands after your first order.");
        setCodeInput("");
        showToast("Referral code applied!");
      } catch (err) {
        setApplyError(err.message);
      } finally {
        setApplying(false);
      }
    },
    [profile, isCodeValid, codeInput, router, showToast]
  );

  return (
    <div className="min-h-screen bg-brand-dark text-gray-100">
      <AccountHeader profile={profile} onLogout={logout} activeTab="/account/referrals" />

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-white">
            Referrals
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Share your code — you both get{" "}
            <span className="text-brand-gold font-bold">{formatGHS(REFERRAL_REWARD_GHS)}</span> in points.
          </p>
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

        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={Users} label="Total" value={loading ? "—" : totals.total} />
          <StatCard icon={Trophy} label="Completed" value={loading ? "—" : totals.completed} accent="emerald" />
          <StatCard icon={Wallet} label="Earned" value={loading ? "—" : formatGHS(totals.earned)} accent="gold" />
        </div>

        <div className="bg-gradient-to-br from-brand-card to-gray-900 border border-gray-700 rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="relative flex items-start justify-between gap-4 mb-5">
            <div className="min-w-0">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                Your Referral Code
              </div>
              <div className="text-2xl sm:text-3xl font-black text-brand-gold font-mono mt-1 break-all">
                {loading ? "…" : myActiveCode || "—"}
              </div>
              <div className="text-xs text-gray-400 mt-2 max-w-md">
                Share it with friends. When they place their first order, you both earn{" "}
                <span className="text-brand-gold font-bold">{formatGHS(REFERRAL_REWARD_GHS)}</span> in loyalty points.
              </div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center shrink-0">
              <Gift className="w-7 h-7 text-brand-gold" />
            </div>
          </div>

          <div className="relative grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              onClick={hasActiveCode ? copyCode : generate}
              disabled={generating || loading}
              className="col-span-2 sm:col-span-1 py-3 rounded-xl bg-brand-gold hover:bg-brand-amber disabled:opacity-50 text-brand-dark font-extrabold text-sm transition-colors inline-flex items-center justify-center gap-1.5"
            >
              {generating ? (
                "Generating…"
              ) : hasActiveCode ? (
                <>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied" : "Copy code"}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate code
                </>
              )}
            </button>
            <button
              onClick={share}
              disabled={sharing || loading}
              className="py-3 rounded-xl bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white font-bold text-sm transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <Share2 className="w-4 h-4" />
              {sharing ? "…" : "Share"}
            </button>
            <button
              onClick={shareWhatsApp}
              disabled={!hasActiveCode || loading}
              className="py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-sm transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </button>
          </div>
        </div>

        <div className="bg-brand-card border border-gray-700 rounded-3xl p-6">
          <h2 className="font-heading text-lg font-bold text-white mb-1">
            Have a friend's code?
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Enter it below to get {formatGHS(REFERRAL_REWARD_GHS)} in points after your next order.
          </p>
          <form onSubmit={applyCode} className="flex gap-2" aria-busy={applying}>
            <input
              value={codeInput}
              onChange={(e) => {
                setCodeInput(e.target.value.toUpperCase());
                if (applyError) setApplyError("");
              }}
              placeholder="MRF-AB123"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className={`flex-1 px-4 py-3 rounded-xl bg-brand-dark border text-white text-sm font-mono outline-none focus:ring-2 transition-colors ${
                codeInput.length > 0 && !isCodeValid
                  ? "border-red-500/60 focus:ring-red-500/30"
                  : "border-gray-700 focus:border-brand-gold focus:ring-brand-gold/40"
              }`}
            />
            <button
              type="submit"
              disabled={applying || !isCodeValid}
              className="px-5 py-3 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {applying ? "Applying…" : "Apply"}
            </button>
          </form>
          {applyMessage && (
            <p role="status" className="text-xs text-emerald-400 mt-2 inline-flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              {applyMessage}
            </p>
          )}
          {applyError && (
            <p role="alert" className="text-xs text-red-400 mt-2 inline-flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {applyError}
            </p>
          )}
        </div>

        <div>
          <h2 className="font-heading text-lg font-bold text-white mb-4">
            Your Referrals{" "}
            {referrals.length > 0 && (
              <span className="text-gray-500 text-sm font-normal">({referrals.length})</span>
            )}
          </h2>

          {loading ? (
            <ReferralsSkeleton count={3} />
          ) : referrals.length === 0 ? (
            <div className="bg-brand-card border border-gray-700 rounded-2xl p-10 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                <Gift className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="font-bold text-white">No referrals yet</h3>
              <p className="text-gray-400 text-sm mt-1 max-w-sm mx-auto">
                Share your code with friends — when they order, you both get rewarded.
              </p>
              <button
                onClick={share}
                disabled={!hasActiveCode || sharing}
                className="mt-4 px-5 py-2.5 rounded-xl bg-brand-gold hover:bg-brand-amber disabled:opacity-50 text-brand-dark font-bold text-sm transition-colors inline-flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share your code
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {referrals.map((r) => (
                <div
                  key={r.id}
                  className="bg-brand-card border border-gray-700 rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-gray-600 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-brand-gold font-bold">
                      {r.code}
                    </div>
                    <div className="text-sm text-white mt-1 truncate">
                      {r.referee_name ? (
                        <>Referred: {r.referee_name}</>
                      ) : (
                        <span className="text-gray-500">Not used yet — share it!</span>
                      )}
                    </div>
                    {r.created_at && (
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        <time dateTime={r.created_at}>{formatDateTime(r.created_at)}</time>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <StatusPill status={r.status} />
                    {r.status === "completed" && (
                      <span className="text-[11px] text-emerald-400 font-bold">
                        +{formatGHS(REFERRAL_REWARD_GHS)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Link
          href="/menu"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-gold transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to menu
        </Link>
      </main>

      <Toast toast={toast} />
    </div>
  );
}