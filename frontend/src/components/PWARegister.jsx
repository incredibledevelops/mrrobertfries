"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DISMISS_KEY = "mrf_pwa_dismissed";
const SHOW_DELAY_MS = 4000;

export default function PWARegister() {
  const [deferred, setDeferred] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(true); // default hidden until we know
  const deferredRef = useRef(null);

  // Register service worker once
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Only register in production, or when explicitly enabled
    navigator.serviceWorker
      .register("/sw.js")
      .catch(() => {
        /* silent — non-fatal */
      });
  }, []);

  // Read dismissed state after mount (avoids hydration mismatch)
  useEffect(() => {
    try {
      setDismissed(!!localStorage.getItem(DISMISS_KEY));
    } catch {
      setDismissed(false);
    }
  }, []);

  // Capture install prompt + appinstalled
  useEffect(() => {
    if (typeof window === "undefined") return;

    function onBeforeInstall(e) {
      e.preventDefault();
      deferredRef.current = e;
      setDeferred(e);

      // Already installed? don't prompt.
      const standalone =
        window.matchMedia?.("(display-mode: standalone)").matches ||
        window.navigator.standalone === true;
      if (standalone) return;

      // Don't show if dismissed
      try {
        if (localStorage.getItem(DISMISS_KEY)) return;
      } catch {}

      // Delay so it doesn't compete with first-paint content
      setTimeout(() => {
        if (deferredRef.current) setShowBanner(true);
      }, SHOW_DELAY_MS);
    }

    function onAppInstalled() {
      setShowBanner(false);
      setDeferred(null);
      deferredRef.current = null;
      try {
        localStorage.setItem(DISMISS_KEY, "1");
      } catch {}
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    const prompt = deferredRef.current;
    if (!prompt) return;
    prompt.prompt();
    try {
      const choice = await prompt.userChoice;
      if (choice.outcome === "dismissed") {
        // user said no this time — remember so we don't nag
        try {
          localStorage.setItem(DISMISS_KEY, "1");
        } catch {}
        setDismissed(true);
      }
    } catch {
      /* ignore */
    }
    setDeferred(null);
    deferredRef.current = null;
    setShowBanner(false);
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setShowBanner(false);
    setDismissed(true);
  }, []);

  // Esc to dismiss
  useEffect(() => {
    if (!showBanner) return;
    function onKey(e) {
      if (e.key === "Escape") dismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showBanner, dismiss]);

  if (!showBanner || dismissed || !deferred) return null;

  return (
    <div
      role="dialog"
      aria-label="Install app"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 animate-in slide-in-from-bottom-4 fade-in"
    >
      <div className="bg-brand-card border border-brand-gold/40 rounded-2xl p-4 shadow-2xl flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-gold to-brand-crimson flex items-center justify-center text-brand-dark font-black shrink-0">
          🍟
        </div>
        <div className="flex-1">
          <div className="text-white font-bold text-sm">
            Install Mr. Robert's Fries
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Add to your home screen for faster ordering.
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={install}
              className="px-3 py-1.5 rounded-lg bg-brand-gold text-brand-dark text-xs font-extrabold hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-gold/60"
            >
              Install
            </button>
            <button
              onClick={dismiss}
              className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-xs font-bold hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-600"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}