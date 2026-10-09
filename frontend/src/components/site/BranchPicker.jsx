"use client";

import { MapPin, Building2, Loader2 } from "lucide-react";
import { useBranch } from "./BranchContext";

export default function BranchPicker() {
  const { branches, activeBranchId, setActiveBranchId, loading } = useBranch();

  if (loading) {
    return (
      <div className="border-b border-gray-800 bg-brand-card/30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Loader2 className="w-4 h-4 text-brand-gold animate-spin" />
          <span className="text-xs text-gray-400">Loading branches…</span>
        </div>
      </div>
    );
  }

  if (branches.length <= 1) return null;

  return (
    <div className="border-b border-gray-800 bg-brand-card/30">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 overflow-x-auto no-scrollbar">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase whitespace-nowrap">
          <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
          Ordering from:
        </span>

        {branches.map((b) => {
          const isActive = activeBranchId === b.id;
          return (
            <button
              key={b.id}
              onClick={() => setActiveBranchId(b.id)}
              aria-pressed={isActive}
              className={`group relative inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-brand-gold text-brand-dark shadow-lg shadow-brand-gold/20"
                  : "bg-brand-card border border-gray-700 text-gray-300 hover:text-white hover:border-brand-gold/40"
              }`}
            >
              <MapPin
                className={`w-3.5 h-3.5 transition-transform ${
                  isActive
                    ? "scale-110"
                    : "group-hover:scale-110 group-hover:text-brand-gold"
                }`}
                aria-hidden="true"
              />
              {b.name}
              {isActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-brand-gold" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}