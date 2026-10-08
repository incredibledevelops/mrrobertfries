"use client";

import { useEffect, useState } from "react";

export default function SearchBar({ onClick, compact = false }) {
  const [shortcut, setShortcut] = useState("Ctrl K");

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
    setShortcut(isMac ? "⌘K" : "Ctrl K");
  }, []);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open search"
      title={`Search (${shortcut})`}
      className={`group flex items-center gap-2 rounded-xl bg-brand-card border border-gray-700 text-gray-400 hover:border-brand-gold/60 hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/50 ${
        compact ? "px-3 py-2" : "px-4 py-2 w-full"
      }`}
    >
      <span className="text-sm" aria-hidden="true">🔍</span>
      {!compact && (
        <span className="text-xs font-medium flex-1 text-left">
          Search…
        </span>
      )}
      <kbd className="hidden md:inline-flex items-center gap-0.5 text-[10px] text-gray-500 border border-gray-700 px-1.5 py-0.5 rounded whitespace-nowrap">
        {shortcut}
      </kbd>
    </button>
  );
}