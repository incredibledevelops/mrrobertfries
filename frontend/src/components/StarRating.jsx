"use client";

export default function StarRating({
  rating = 0,
  size = "md",
  showValue = false,
  count = null,
}) {
  const sizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
  };

  const clamped = Math.max(0, Math.min(5, Number(rating) || 0));
  const full = Math.floor(clamped);
  const hasHalf = clamped - full >= 0.25 && clamped - full < 0.75;
  const rounded = Math.round(clamped * 10) / 10;

  const label =
    count !== null
      ? `${rounded.toFixed(1)} out of 5 stars from ${count} review${
          count === 1 ? "" : "s"
        }`
      : `${rounded.toFixed(1)} out of 5 stars`;

  return (
    <span
      className={`inline-flex items-center gap-1 ${sizes[size]}`}
      role="img"
      aria-label={label}
      title={label}
    >
      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => {
          if (n <= full) {
            return (
              <span key={n} className="text-brand-gold">
                ★
              </span>
            );
          }
          if (n === full + 1 && hasHalf) {
            return (
              <span key={n} className="relative inline-block text-gray-700">
                <span>★</span>
                <span
                  className="absolute inset-0 overflow-hidden text-brand-gold"
                  style={{ width: "50%" }}
                >
                  ★
                </span>
              </span>
            );
          }
          return (
            <span key={n} className="text-gray-700">
              ★
            </span>
          );
        })}
      </span>
      {showValue && (
        <span className="text-xs text-gray-400 ml-1" aria-hidden="true">
          {rounded.toFixed(1)}
          {count !== null && ` (${count})`}
        </span>
      )}
    </span>
  );
}