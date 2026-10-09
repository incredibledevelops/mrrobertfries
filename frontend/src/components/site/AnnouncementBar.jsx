"use client";

import { Phone, Truck, Sparkles } from "lucide-react";

export default function AnnouncementBar() {
  return (
    <div className="relative bg-gradient-to-r from-brand-crimson via-brand-amber to-brand-gold text-white text-xs md:text-sm font-semibold overflow-hidden">
      {/* Subtle shimmer overlay */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
          animation: "shimmer 6s infinite",
        }}
      />
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-shimmer { animation: none; }
        }
      `}</style>

      <div className="relative max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5">
          <Truck className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">
            Delivering to East Legon, UG Legon, UPSA, Adjiringanor & KNUST
          </span>
          <span className="sm:hidden">Delivering across Accra & Kumasi</span>
        </span>

        <span className="hidden md:inline text-white/60" aria-hidden="true">
          •
        </span>

        <a
          href="tel:0599233488"
          className="inline-flex items-center gap-1.5 underline decoration-white/40 underline-offset-2 hover:decoration-white transition-all group"
        >
          <Phone className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" aria-hidden="true" />
          <span className="font-bold">0599233488</span>
        </a>

        <span className="hidden lg:inline-flex items-center gap-1 text-white/80 text-[11px] ml-2">
          <Sparkles className="w-3 h-3" aria-hidden="true" />
          Free delivery on orders over GH₵ 100
        </span>
      </div>
    </div>
  );
}