"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiSend } from "@/lib/api";

const TOKEN_KEY = "mrf_token";
const TOKEN_ISSUED_AT_KEY = "mrf_token_issued_at";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const IS_DEV = process.env.NODE_ENV !== "production";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ------------------------------------------------------------------ */
/*  helpers                                                            */
/* ------------------------------------------------------------------ */

function readExistingToken() {
  if (typeof window === "undefined") return null;
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    const issuedAt = Number(localStorage.getItem(TOKEN_ISSUED_AT_KEY) || 0);
    // If we don't know when it was issued, treat it as fresh enough.
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

function saveToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_ISSUED_AT_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

function friendlyError(err) {
  // Try to use status if present
  const status = err?.status || err?.response?.status;
  const raw = String(err?.message || err?.detail || "");

  if (status === 401 || /invalid|incorrect|unauthor/i.test(raw)) {
    return "Incorrect email or password.";
  }
  if (status === 403) return "Your account can't access the admin panel.";
  if (status === 429) return "Too many attempts. Please wait a moment and try again.";
  if (status >= 500) return "Server error. Please try again in a moment.";
  if (/network|failed to fetch|fetch failed/i.test(raw)) {
    return "Can't reach the server. Check your connection and try again.";
  }
  return raw || "Sign in failed. Please try again.";
}

/* ------------------------------------------------------------------ */
/*  page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminLogin() {
  const router = useRouter();
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const errorRef = useRef(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryIn, setRetryIn] = useState(0);
  const [checkedAuth, setCheckedAuth] = useState(false);

  // Bounce already-authenticated admins to the dashboard
  useEffect(() => {
    const token = readExistingToken();
    if (token) {
      router.replace("/admin/dashboard");
      return;
    }
    setCheckedAuth(true);
  }, [router]);

  // Cooldown ticker for 429s
  useEffect(() => {
    if (retryIn <= 0) return;
    const t = setInterval(() => {
      setRetryIn((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [retryIn]);

  // Focus the error banner when it appears (screen readers + sighted users)
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.focus?.();
    }
  }, [error]);

  const emailValid = useMemo(() => EMAIL_RE.test(email.trim()), [email]);
  const passwordValid = useMemo(() => password.length >= 6, [password]);
  const canSubmit =
    emailValid && passwordValid && !loading && retryIn === 0;

  const handleLogin = useCallback(
    async (e) => {
      e.preventDefault();
      if (!canSubmit) {
        // Focus first invalid field
        if (!emailValid) emailRef.current?.focus();
        else if (!passwordValid) passwordRef.current?.focus();
        return;
      }

      setError("");
      setLoading(true);
      try {
        const data = await apiSend("/api/v1/auth/login", "POST", {
          email: email.trim(),
          password,
        });

        const token = data?.access_token;
        if (!token) throw new Error("Server didn't return a token.");

        saveToken(token);
        // Replace so the back button doesn't land on the login form
        router.replace("/admin/dashboard");
      } catch (err) {
        // Handle 429 with Retry-After if available
        const status = err?.status || err?.response?.status;
        const retryAfter =
          err?.response?.headers?.get?.("retry-after") ||
          err?.retryAfter;
        if (status === 429 && retryAfter) {
          const secs = Math.max(1, parseInt(retryAfter, 10) || 30);
          setRetryIn(secs);
        }
        setError(friendlyError(err));
        setPassword(""); // don't keep a bad password in memory
        // Refocus password on auth failure so the user can retry immediately
        requestAnimationFrame(() => passwordRef.current?.focus());
      } finally {
        setLoading(false);
      }
    },
    [canSubmit, emailValid, passwordValid, email, password, router]
  );

  // Esc clears the error
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && error) setError("");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [error]);

  // Don't flash the form while we check the token
  if (!checkedAuth) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-brand-card border border-gray-700 rounded-3xl p-8 space-y-4">
          <div className="h-8 w-40 mx-auto rounded bg-gray-700/60 animate-pulse" />
          <div className="h-12 rounded-xl bg-gray-700/40 animate-pulse" />
          <div className="h-12 rounded-xl bg-gray-700/40 animate-pulse" />
          <div className="h-12 rounded-xl bg-gray-700/60 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
      <form
        onSubmit={handleLogin}
        aria-busy={loading}
        className="w-full max-w-sm bg-brand-card border border-gray-700 rounded-3xl p-8 space-y-4"
      >
        <header className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-gold to-brand-crimson flex items-center justify-center text-brand-dark font-black text-xl mx-auto">
            MR
          </div>
          <h1 className="font-heading text-2xl font-extrabold text-white mt-3">
            Admin Login
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Sign in to manage orders, menu & branches.
          </p>
        </header>

        {/* Error banner with reserved space to avoid layout shift */}
        <div className="min-h-[2.5rem]">
          {error && (
            <div
              ref={errorRef}
              tabIndex={-1}
              role="alert"
              aria-live="assertive"
              className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs focus:outline-none"
            >
              {error}
              {retryIn > 0 && (
                <span className="block mt-1 text-[11px] text-red-300">
                  Try again in {retryIn}s.
                </span>
              )}
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="admin-email"
            className="block text-xs font-bold text-gray-300 mb-1"
          >
            Email
          </label>
          <input
            id="admin-email"
            ref={emailRef}
            type="email"
            required
            autoComplete="email"
            autoFocus
            disabled={loading}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError("");
            }}
            aria-invalid={email.length > 0 && !emailValid}
            className={`w-full px-4 py-3 rounded-xl bg-brand-dark border text-white text-sm outline-none transition-colors focus:ring-2 ${
              email.length > 0 && !emailValid
                ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30"
                : "border-gray-700 focus:border-brand-gold focus:ring-brand-gold/40"
            } disabled:opacity-60`}
            placeholder="admin@mrfries.com"
          />
          {email.length > 0 && !emailValid && (
            <p className="text-[11px] text-red-400 mt-1">
              Enter a valid email address.
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="admin-password"
            className="block text-xs font-bold text-gray-300 mb-1"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="admin-password"
              ref={passwordRef}
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              disabled={loading}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              aria-invalid={password.length > 0 && !passwordValid}
              className={`w-full px-4 py-3 pr-12 rounded-xl bg-brand-dark border text-white text-sm outline-none transition-colors focus:ring-2 ${
                password.length > 0 && !passwordValid
                  ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30"
                  : "border-gray-700 focus:border-brand-gold focus:ring-brand-gold/40"
              } disabled:opacity-60`}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              tabIndex={-1}
              className="absolute inset-y-0 right-2 my-auto w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold/40"
            >
              {showPassword ? "🙈" : "👁"}
            </button>
          </div>
          {password.length > 0 && !passwordValid && (
            <p className="text-[11px] text-red-400 mt-1">
              Password must be at least 6 characters.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-3 rounded-xl bg-brand-gold hover:bg-brand-amber disabled:opacity-50 disabled:cursor-not-allowed text-brand-dark font-extrabold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/60 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-brand-dark/40 border-t-brand-dark animate-spin" />
              Signing in…
            </>
          ) : retryIn > 0 ? (
            `Try again in ${retryIn}s`
          ) : (
            "Sign In"
          )}
        </button>

        {IS_DEV && (
          <p className="text-[10px] text-gray-500 text-center">
            Dev hint: admin@mrfries.com / Admin@1234
          </p>
        )}

        <p className="text-[10px] text-gray-500 text-center">
          Trouble signing in? Contact your administrator.
        </p>
      </form>
    </div>
  );
}