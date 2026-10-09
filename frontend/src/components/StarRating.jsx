"use client";

import { Star } from "lucide-react";

const SIZE_CLASSES = {
  sm: { star: "w-3.5 h-3.5", text: "text-xs" },
  md: { star: "w-4 h-4", text: "text-sm" },
  lg: { star: "w-5 h-5", text: "text-base" },
  xl: { star: "w-8 h-8", text: "text-2xl" },
};

export default function StarRating({
  rating = 0,
  size = "md",
  showValue = false,
  count = null,
  interactive = false,
  onChange = null,
}) {
  const { star: starSize, text: textSize } = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  const clamped = Math.max(0, Math.min(5, Number(rating) || 0));
  const rounded = Math.round(clamped * 10) / 10;

  const label =
    count !== null
      ? `${rounded.toFixed(1)} out of 5 stars from ${count} review${
          count === 1 ? "" : "s"
        }`
      : `${rounded.toFixed(1)} out of 5 stars`;

  function handleClick(value) {
    if (!interactive || !onChange) return;
    onChange(value);
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${textSize}`}
      role={interactive ? "radiogroup" : "img"}
      aria-label={interactive ? "Rate this item" : label}
      title={interactive ? undefined : label}
    >
      <span className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const fillPct = Math.max(0, Math.min(100, (clamped - (n - 1)) * 100));
          const isFull = fillPct >= 100;
          const isEmpty = fillPct <= 0;

          return (
            <button
              key={n}
              type="button"
              onClick={() => handleClick(n)}
              disabled={!interactive}
              role={interactive ? "radio" : undefined}
              aria-checked={interactive ? Math.round(clamped) === n : undefined}
              aria-label={interactive ? `${n} star${n === 1 ? "" : "s"}` : undefined}
              tabIndex={interactive ? 0 : -1}
              className={`relative inline-flex items-center justify-center transition-transform ${
                interactive
                  ? "cursor-pointer hover:scale-110 focus:outline-none focus:ring-2 focus:ring-brand-gold/60 rounded"
                  : "cursor-default"
              }`}
            >
              {/* Empty star (background) */}
              <Star
                className={`${starSize} ${
                  interactive ? "text-gray-600" : "text-gray-700"
                }`}
                strokeWidth={2}
                aria-hidden="true"
              />

              {/* Filled star (foreground) — clipped by percentage */}
              {!isEmpty && (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${fillPct}%` }}
                  aria-hidden="true"
                >
                  <Star
                    className={`${starSize} text-brand-gold fill-brand-gold`}
                    strokeWidth={2}
                  />
                </span>
              )}
            </button>
          );
        })}
      </span>

      {showValue && (
        <span className="text-gray-400 ml-0.5 font-medium">
          {rounded.toFixed(1)}
          {count !== null && (
            <span className="text-gray-500"> ({count})</span>
          )}
        </span>
      )}
    </span>
  );
}