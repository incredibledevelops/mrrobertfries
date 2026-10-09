"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ShoppingBag, User, Menu, X, Utensils } from "lucide-react";
import { useCart } from "./CartContext";
import { useBranch } from "./BranchContext";
import SearchBar from "@/components/SearchBar";
import { getCustomerToken } from "@/lib/customerAuth";

const NAV = [
  { href: "/menu", label: "Menu" },
  { href: "/builder", label: "Custom Bowl" },
  { href: "/locations", label: "Delivery" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  const pathname = usePathname();
  const { count, subtotal, setCartOpen } = useCart();
  const { activeBranch } = useBranch();
  const [loggedIn, setLoggedIn] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartBump, setCartBump] = useState(false);

  // Track the previous count to detect a genuine increment.
  const prevCountRef = useRef(count);

  // Sync loggedIn from token, on every route change.
  useEffect(() => {
    setLoggedIn(!!getCustomerToken());
  }, [pathname]);

  // Also react to token changes from other tabs.
  useEffect(() => {
    function onStorage(e) {
      if (!e.key || !e.key.startsWith("mrf_customer")) return;
      setLoggedIn(!!getCustomerToken());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Bump the cart badge only when count increases.
  useEffect(() => {
    // Always record the new count first — this is the fix for B13.
    const prev = prevCountRef.current;
    prevCountRef.current = count;

    if (count > prev) {
      setCartBump(true);
      const t = setTimeout(() => setCartBump(false), 400);
      return () => clearTimeout(t);
    }
  }, [count]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  function openSearch() {
    if (typeof window !== "undefined" && window.__openSearch) {
      window.__openSearch();
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-brand-dark/95 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 shrink-0 group"
            aria-label="Mr. Robert's Fries home"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-gold to-brand-crimson p-0.5 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-brand-dark rounded-[14px] flex items-center justify-center">
                <Utensils
                  className="w-5 h-5 text-brand-gold"
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="font-heading text-xl font-black text-white leading-none">
                Mr. Robert's <span className="text-brand-gold">Fries</span>
              </div>
              <div className="text-[10px] text-gray-400 tracking-widest uppercase">
                {activeBranch?.name || "Loading…"}
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1 text-sm">
            {NAV.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href + "/"));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative px-3 py-2 rounded-lg transition-colors ${
                    active
                      ? "text-brand-gold font-bold"
                      : "text-gray-300 hover:text-brand-gold hover:bg-gray-800/50"
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute -bottom-[21px] left-1/2 -translate-x-1/2 w-8 h-0.5 bg-brand-gold rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Search */}
          <div className="hidden md:block flex-1 max-w-xs">
            <SearchBar onClick={openSearch} />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <div className="md:hidden">
              <SearchBar onClick={openSearch} compact />
            </div>

            <Link
              href="/account"
              className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-card border border-gray-700 text-xs font-bold text-white hover:border-brand-gold transition-colors"
              aria-label={loggedIn ? "My account" : "Sign in"}
            >
              <User className="w-4 h-4" aria-hidden="true" />
              <span>{loggedIn ? "Account" : "Sign In"}</span>
            </Link>

            <button
              onClick={() => setCartOpen(true)}
              aria-label={`Open cart with ${count} item${count === 1 ? "" : "s"}`}
              className={`relative inline-flex items-center gap-2 p-2.5 sm:px-3 sm:py-2.5 rounded-2xl bg-brand-card border border-gray-700 text-brand-gold hover:border-brand-gold transition-all ${
                cartBump ? "scale-110" : "scale-100"
              }`}
            >
              <ShoppingBag className="w-5 h-5" aria-hidden="true" />
              {count > 0 && (
                <span
                  className={`absolute -top-1 -right-1 bg-brand-crimson text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center border-2 border-brand-dark transition-transform ${
                    cartBump ? "scale-125" : "scale-100"
                  }`}
                >
                  {count}
                </span>
              )}
              {count > 0 && (
                <span className="hidden sm:inline font-bold text-sm text-white">
                  GH₵ {subtotal.toFixed(2)}
                </span>
              )}
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              className="lg:hidden p-2.5 rounded-2xl bg-brand-card border border-gray-700 text-white hover:border-brand-gold transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile slide-down nav */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-800 bg-brand-card/50 animate-[slideDown_200ms_ease-out]">
            <style jsx>{`
              @keyframes slideDown {
                from { opacity: 0; transform: translateY(-8px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}</style>
            <nav className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
              {NAV.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href + "/"));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                      active
                        ? "bg-brand-gold text-brand-dark"
                        : "text-gray-300 hover:bg-gray-800/60 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <Link
                href="/account"
                className="mt-1 px-4 py-3 rounded-xl bg-brand-card border border-gray-700 text-sm font-bold text-white hover:border-brand-gold transition-colors inline-flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                {loggedIn ? "My Account" : "Sign In"}
              </Link>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}