"use client";

/* ---------- primitives ---------- */

export function SkeletonLine({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse motion-reduce:animate-none bg-gray-700/60 rounded ${className}`}
    />
  );
}

export function SkeletonBlock({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse motion-reduce:animate-none bg-gray-700/40 rounded-2xl ${className}`}
    />
  );
}

/* ---------- composed ---------- */

export function MenuCardSkeleton() {
  return (
    <div className="bg-brand-card rounded-2xl border border-gray-700 overflow-hidden">
      <SkeletonBlock className="h-48 rounded-none" />
      <div className="p-5 space-y-3">
        <SkeletonLine className="h-5 w-3/4" />
        <SkeletonLine className="h-3 w-full" />
        <SkeletonLine className="h-3 w-2/3" />
      </div>
      <div className="p-5 pt-0">
        <SkeletonBlock className="h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function MenuGridSkeleton({ count = 6 }) {
  return (
    <div
      role="status"
      aria-label="Loading menu"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {Array.from({ length: count }).map((_, i) => (
        <MenuCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function CategoryTabsSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading categories"
      className="flex items-center justify-center gap-2 mb-8"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonBlock key={i} className="h-11 w-32 rounded-xl" />
      ))}
    </div>
  );
}

export function BuilderSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading bowl builder"
      className="bg-brand-card rounded-3xl border border-gray-700 p-6 space-y-8"
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <SkeletonLine className="h-5 w-40" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, j) => (
              <SkeletonBlock key={j} className="h-16" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ZoneCardSkeleton() {
  return (
    <div className="p-4 rounded-2xl bg-brand-card border border-gray-700 space-y-2">
      <SkeletonLine className="h-4 w-2/3" />
      <SkeletonLine className="h-3 w-full" />
      <SkeletonLine className="h-3 w-1/2" />
    </div>
  );
}

export function OrderTrackingSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading order"
      className="max-w-lg w-full bg-brand-card border border-gray-700 rounded-3xl p-8"
    >
      <div className="flex flex-col items-center space-y-4">
        <SkeletonBlock className="w-20 h-20 rounded-full" />
        <SkeletonLine className="h-7 w-2/3" />
        <SkeletonLine className="h-4 w-full" />
      </div>
      <div className="mt-8 p-4 rounded-2xl bg-brand-dark border border-gray-700 space-y-3">
        <SkeletonLine className="h-4 w-full" />
        <SkeletonLine className="h-4 w-3/4" />
        <SkeletonLine className="h-4 w-1/2" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div
      role="status"
      aria-label="Loading table"
      className="space-y-3"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center">
          <SkeletonLine className="h-4 flex-1" />
          <SkeletonLine className="h-4 w-24" />
          <SkeletonLine className="h-4 w-20" />
          <SkeletonLine className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-brand-card border border-gray-700 rounded-2xl p-5 space-y-2">
      <SkeletonLine className="h-3 w-24" />
      <SkeletonLine className="h-7 w-32" />
    </div>
  );
}