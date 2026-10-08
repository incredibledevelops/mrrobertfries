"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "./CartContext";
import { useBranch } from "./BranchContext";
import SearchBar from "@/components/SearchBar";
import { getCustomerToken } from "@/lib/customerAuth";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    setLoggedIn(!!getCustomerToken());
  }, []);

  function openSearch() {
    if (typeof window !== "undefined" && window.__openSearch) {
      window.__openSearch();
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-brand-dark/95 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-gold to-brand-crimson p-0.5">
            <div className="w-full h-full bg-brand-dark rounded-[14px] flex items-center justify-center">
              <span className="font-heading text-2xl font-black text-brand-gold">
                MR
              </span>
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

        <nav className="hidden lg:flex items-center gap-6 text-sm text-gray-300">
          {NAV.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`transition-colors ${
                  active
                    ? "text-brand-gold font-bold"
                    : "hover:text-brand-gold"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:block flex-1 max-w-xs">
          <SearchBar onClick={openSearch} />
        </div>

        <div className="flex items-center gap-2">
          <div className="md:hidden">
            <SearchBar onClick={openSearch} compact />
          </div>
          <Link
            href="/account"
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-card border border-gray-700 text-xs font-bold text-white hover:border-brand-gold transition-colors"
          >
            👤 {loggedIn ? "Account" : "Sign In"}
          </Link>
          <button
            onClick={() => setCartOpen(true)}
            className="relative p-3 rounded-2xl bg-brand-card border border-gray-700 text-brand-gold flex items-center gap-2"
          >
            🛒
            <span className="bg-brand-crimson text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {count}
            </span>
            <span className="hidden sm:inline font-bold text-sm text-white">
              GH₵ {subtotal.toFixed(2)}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile nav row */}
      <div className="lg:hidden border-t border-gray-800 overflow-x-auto no-scrollbar">
        <div className="flex gap-1 px-4 py-2">
          {NAV.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
                  active
                    ? "bg-brand-gold text-brand-dark"
                    : "bg-brand-card text-gray-400"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}