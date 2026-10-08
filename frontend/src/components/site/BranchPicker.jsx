"use client";

import { useBranch } from "./BranchContext";

export default function BranchPicker() {
  const { branches, activeBranchId, setActiveBranchId } = useBranch();

  if (branches.length <= 1) return null;

  return (
    <div className="border-b border-gray-800 bg-brand-card/30">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 overflow-x-auto no-scrollbar">
        <span className="text-xs font-bold text-gray-400 uppercase whitespace-nowrap">
          Ordering from:
        </span>
        {branches.map((b) => (
          <button
            key={b.id}
            onClick={() => setActiveBranchId(b.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              activeBranchId === b.id
                ? "bg-brand-gold text-brand-dark"
                : "bg-brand-card border border-gray-700 text-gray-300 hover:text-white"
            }`}
          >
            📍 {b.name}
          </button>
        ))}
      </div>
    </div>
  );
}