"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Quote, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { API_URL } from "@/lib/api";
import StarRating from "@/components/StarRating";
import { SkeletonBlock, SkeletonLine } from "@/components/Skeleton";

const ROTATE_MS = 7000;

function relativeDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const day = 86_400_000;
  if (diff < day) return "Today";
  if (diff < 2 * day) return "Yesterday";
  if (diff < 7 * day) return `${Math.floor(diff / day)} days ago`;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function FeaturedReviewsSkeleton() {
  return (
    <section className="py-16 bg-brand-card/30 border-y border-gray-800">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-10 space-y-3">
          <SkeletonLine className="h-6 w-40 mx-auto rounded-full" />
          <SkeletonLine className="h-9 w-80 mx-auto" />
        </div>
        <div className="bg-brand-card rounded-3xl border border-gray-700 p-8 sm:p-12 space-y-4">
          <SkeletonLine className="h-6 w-32 mx-auto" />
          <SkeletonLine className="h-4 w-full" />
          <SkeletonLine className="h-4 w-5/6 mx-auto" />
          <SkeletonLine className="h-4 w-2/3 mx-auto" />
        </div>
      </div>
    </section>
  );
}

export default function FeaturedReviews() {
  const [reviews, setReviews] = useState([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);

  const touchStartX = useRef(null);
  const reducedMotion = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    reducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/v1/reviews/recent?featured_only=true&limit=10`,
          { cache: "no-store", signal: controller.signal }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setReviews(Array.isArray(data) ? data : []);
      } catch (e) {
        if (e.name !== "AbortError") setReviews([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (current >= reviews.length) setCurrent(0);
  }, [reviews.length, current]);

  useEffect(() => {
    if (reviews.length <= 1) return;
    if (paused) return;
    if (reducedMotion.current) return;

    function onVisibility() {
      if (document.hidden) setPaused(true);
      else setPaused(false);
    }
    document.addEventListener("visibilitychange", onVisibility);

    const t = setInterval(() => {
      setCurrent((i) => (i + 1) % reviews.length);
    }, ROTATE_MS);

    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reviews.length, paused]);

  const onKeyDown = useCallback(
    (e) => {
      if (reviews.length <= 1) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrent((i) => (i - 1 + reviews.length) % reviews.length);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrent((i) => (i + 1) % reviews.length);
      }
    },
    [reviews.length]
  );

  const onTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const onTouchEnd = useCallback(
    (e) => {
      if (touchStartX.current == null || reviews.length <= 1) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      touchStartX.current = null;
      if (Math.abs(dx) < 40) return;
      if (dx < 0) setCurrent((i) => (i + 1) % reviews.length);
      else setCurrent((i) => (i - 1 + reviews.length) % reviews.length);
    },
    [reviews.length]
  );

  const currentReview = useMemo(() => reviews[current], [reviews, current]);

  if (loading) return <FeaturedReviewsSkeleton />;
  if (reviews.length === 0) return null;

  const r = currentReview;

  return (
    <section className="py-16 bg-brand-card/30 border-y border-gray-800">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-10">
          <span className="text-brand-gold font-bold text-xs uppercase tracking-widest bg-brand-gold/10 px-3 py-1 rounded-full border border-brand-gold/20">
            What our customers say
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white mt-3">
            Loved Across Accra &amp; Kumasi
          </h2>
        </div>

        <div
          className="bg-brand-card rounded-3xl border border-gray-700 p-8 sm:p-12 relative focus:outline-none focus:ring-2 focus:ring-brand-gold/40 overflow-hidden"
          tabIndex={0}
          role="region"
          aria-roledescription="carousel"
          aria-label="Customer reviews"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          onKeyDown={onKeyDown}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* Decorative quote */}
          <Quote
            className="w-16 h-16 text-brand-gold/20 absolute top-6 left-6 select-none"
            strokeWidth={1.5}
            aria-hidden="true"
          />

          <div
            className="relative z-10 text-center"
            aria-live="polite"
            aria-atomic="true"
          >
            <div className="flex justify-center mb-4">
              <StarRating rating={r.rating} size="lg" />
            </div>

            {r.comment && (
              <p className="text-lg sm:text-xl text-white leading-relaxed max-w-2xl mx-auto italic">
                {r.comment}
              </p>
            )}

            {Array.isArray(r.photo_urls) && r.photo_urls.length > 0 && (
              <div className="flex justify-center gap-3 mt-6 flex-wrap">
                {r.photo_urls.slice(0, 3).map((u, i) => (
                  <img
                    key={i}
                    src={u}
                    alt=""
                    loading="lazy"
                    className="w-20 h-20 rounded-xl object-cover border-2 border-brand-gold/30"
                  />
                ))}
              </div>
            )}

            <div className="mt-6 text-xs text-gray-500">
              {r.order_reference && (
                <>
                  Order <span className="font-mono">{r.order_reference}</span>
                  {" · "}
                </>
              )}
              <time dateTime={r.created_at}>{relativeDate(r.created_at)}</time>
            </div>
          </div>

          {reviews.length > 1 && (
            <>
              <button
                onClick={() =>
                  setCurrent((i) => (i - 1 + reviews.length) % reviews.length)
                }
                aria-label="Previous review"
                className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full bg-brand-dark/80 border border-gray-700 text-gray-300 hover:text-brand-gold hover:border-brand-gold/60 hover:scale-105 transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrent((i) => (i + 1) % reviews.length)}
                aria-label="Next review"
                className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full bg-brand-dark/80 border border-gray-700 text-gray-300 hover:text-brand-gold hover:border-brand-gold/60 hover:scale-105 transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <div className="flex justify-center gap-2 mt-8">
                {reviews.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    aria-label={`Go to review ${i + 1} of ${reviews.length}`}
                    aria-current={i === current}
                    className={`h-2 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-brand-gold/60 ${
                      i === current
                        ? "bg-brand-gold w-6"
                        : "bg-gray-700 w-2 hover:bg-gray-600"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}