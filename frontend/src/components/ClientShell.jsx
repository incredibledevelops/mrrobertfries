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
  const searchOpenRef = useRef(searchOpen);
  useEffect(() => {
    searchOpenRef.current = searchOpen;
  }, [searchOpen]);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  useEffect(() => {
    function onKey(e) {
      if (e.isComposing) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSearch();
        return;
      }

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