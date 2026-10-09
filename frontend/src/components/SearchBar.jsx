"use client";

import { useEffect, useState } from "react";
import { Search, Command } from "lucide-react";

export default function SearchBar({ onClick, compact = false }) {
  const [isMac, setIsMac] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof navigator === "undefined") return;
    setIsMac(/Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent));
  }, []);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open search"
      title="Search the menu (⌘K / Ctrl+K)"
      className={`group flex items-center gap-2 rounded-xl bg-brand-card border border-gray-700 text-gray-400 hover:border-brand-gold/60 hover:text-gray-200 transition-all focus:outline-none focus:ring-2 focus:ring-brand-gold/50 active:scale-[0.98] ${
        compact ? "px-3 py-2" : "px-4 py-2 w-full"
      }`}
    >
      <Search
        className={`transition-colors group-hover:text-brand-gold ${
          compact ? "w-4 h-4" : "w-4 h-4"
        }`}
        aria-hidden="true"
      />
      {!compact && (
        <span className="text-xs font-medium flex-1 text-left">
          Search…
        </span>
      )}
      <kbd className="hidden md:inline-flex items-center gap-0.5 text-[10px] text-gray-500 border border-gray-700 px-1.5 py-0.5 rounded whitespace-nowrap group-hover:border-gray-600">
        {mounted && !isMac && <span className="font-mono">Ctrl</span>}
        {mounted && isMac ? (
          <Command className="w-3 h-3" />
        ) : (
          mounted && <span className="font-mono">K</span>
        )}
      </kbd>
    </button>
  );
}