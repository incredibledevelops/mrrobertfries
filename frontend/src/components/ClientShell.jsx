"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import SearchModal from "@/components/SearchModal";
import PWARegister from "@/components/PWARegister";

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return false;
}

export default function ClientShell({ children }) {
  const [searchOpen, setSearchOpen] = useState(false);
  // keep latest value in a ref so the keydown listener never needs to re-bind
  const searchOpenRef = useRef(searchOpen);
  useEffect(() => {
    searchOpenRef.current = searchOpen;
  }, [searchOpen]);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      // Ignore IME composition
      if (e.isComposing) return;

      // ⌘K / Ctrl+K — always works, even inside inputs
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSearch();
        return;
      }

      // "/" — only when not typing and search is closed
      if (
        e.key === "/" &&
        !searchOpenRef.current &&
        !isTypingTarget(document.activeElement)
      ) {
        e.preventDefault();
        openSearch();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch]);

  // Expose global openers so any page/component (SearchBar, etc.) can trigger
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.__openSearch = openSearch;
    window.__closeSearch = closeSearch;
    return () => {
      delete window.__openSearch;
      delete window.__closeSearch;
    };
  }, [openSearch, closeSearch]);

  return (
    <>
      {children}
      <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
      <PWARegister />
    </>
  );
}