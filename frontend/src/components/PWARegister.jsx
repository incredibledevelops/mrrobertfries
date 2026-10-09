"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, X, Utensils, Smartphone } from "lucide-react";

const DISMISS_KEY = "mrf_pwa_dismissed";
const SHOW_DELAY_MS = 4000;

export default function PWARegister() {
  const [deferred, setDeferred] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [mounted, setMounted] = useState(false);
  const deferredRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Register service worker once
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  // Read dismissed state after mount
  useEffect(() => {
    try {
      setDismissed(!!localStorage.getItem(DISMISS_KEY));
    } catch {
      setDismissed(false);
    }
  }, []);

  // Capture install prompt
  useEffect(() => {
    if (typeof window === "undefined") return;

    function onBeforeInstall(e) {
      e.preventDefault();
      deferredRef.current = e;
      setDeferred(e);

      const standalone =
        window.matchMedia?.("(display-mode: standalone)").matches ||
        window.navigator.standalone === true;
      if (standalone) return;

      try {
        if (localStorage.getItem(DISMISS_KEY)) return;
      } catch {}

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
    setInstalling(true);
    prompt.prompt();
    try {
      const choice = await prompt.userChoice;
      if (choice.outcome === "dismissed") {
        try {
          localStorage.setItem(DISMISS_KEY, "1");
        } catch {}
        setDismissed(true);
      }
    } catch {}
    setInstalling(false);
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

  useEffect(() => {
    if (!showBanner) return;
    function onKey(e) {
      if (e.key === "Escape") dismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showBanner, dismiss]);

  if (!mounted || !showBanner || dismissed || !deferred) return null;

  return (
    <div
      role="dialog"
      aria-label="Install Mr. Robert's Fries"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 animate-[slideUp_400ms_ease-out]"
      style={{
        animation: "slideUp 400ms ease-out",
      }}
    >
      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div className="bg-brand-card border border-brand-gold/40 rounded-2xl p-4 shadow-2xl shadow-black/50 flex items-start gap-3 relative">
        <button
          onClick={dismiss}
          aria-label="Dismiss install banner"
          className="absolute top-2 right-2 p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-gold to-brand-crimson flex items-center justify-center text-brand-dark shrink-0">
          <Utensils className="w-5 h-5" strokeWidth={2.5} />
        </div>

        <div className="flex-1 pr-6">
          <div className="text-white font-bold text-sm">
            Install Mr. Robert's Fries
          </div>
          <div className="text-xs text-gray-400 mt-1 inline-flex items-center gap-1.5">
            <Smartphone className="w-3 h-3" />
            Order 3× faster from your home screen
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={install}
              disabled={installing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-gold text-brand-dark text-xs font-extrabold hover:bg-brand-amber disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/60"
            >
              <Download className="w-3.5 h-3.5" />
              {installing ? "Installing…" : "Install"}
            </button>
            <button
              onClick={dismiss}
              className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-xs font-bold hover:bg-gray-700 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}