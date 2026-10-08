"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { useBranch } from "@/components/site/BranchContext";
import { ZoneCardSkeleton } from "@/components/Skeleton";

export default function LocationsPage() {
  const { branches } = useBranch();
  const [zonesByBranch, setZonesByBranch] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (branches.length === 0) return;
    (async () => {
      try {
        const results = {};
        for (const b of branches) {
          results[b.id] = await apiGet(
            `/api/v1/delivery-zones?active_only=true&branch_id=${b.id}`
          );
        }
        setZonesByBranch(results);
      } finally {
        setLoading(false);
      }
    })();
  }, [branches]);

  return (
    <>
      <section className="py-12 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="text-xs text-gray-500 mb-3">
            <Link href="/" className="hover:text-brand-gold">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-300">Delivery Areas</span>
          </nav>
          <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-white">
            Where We Deliver
          </h1>
          <p className="text-gray-400 mt-2 max-w-2xl">
            We bring hot & fresh loaded fries straight to your door across Accra
            and Kumasi. Find your area below.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 space-y-10">
          {branches.map((b) => {
            const zones = zonesByBranch[b.id] || [];
            return (
              <div key={b.id}>
                <div className="flex items-baseline justify-between mb-4">
                  <div>
                    <h2 className="font-heading text-2xl font-extrabold text-white">
                      🏢 {b.name}
                    </h2>
                    {b.opening_hours && (
                      <p className="text-xs text-gray-500 mt-1">
                        🕒 {b.opening_hours}
                        {b.phone && ` · 📞 ${b.phone}`}
                      </p>
                    )}
                  </div>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <ZoneCardSkeleton />
                    <ZoneCardSkeleton />
                    <ZoneCardSkeleton />
                  </div>
                ) : zones.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    No delivery zones configured yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {zones.map((z) => (
                      <div
                        key={z.id}
                        className="p-5 rounded-2xl bg-brand-card border border-gray-700"
                      >
                        <div className="font-bold text-white">
                          📍 {z.name}
                        </div>
                        <div className="text-xs text-gray-400 mt-2">
                          {z.description}
                        </div>
                        <div className="flex justify-between mt-3 pt-3 border-t border-gray-800">
                          <span className="text-xs text-gray-500">
                            Delivery fee
                          </span>
                          <span className="text-emerald-400 font-bold text-sm">
                            GH₵ {z.delivery_fee.toFixed(2)}
                          </span>
                        </div>
                        {z.estimated_minutes && (
                          <div className="flex justify-between mt-1">
                            <span className="text-xs text-gray-500">
                              ETA
                            </span>
                            <span className="text-white text-sm font-bold">
                              ~{z.estimated_minutes} min
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="max-w-7xl mx-auto px-4 mt-12">
          <div className="bg-gradient-to-r from-brand-amber to-brand-crimson rounded-3xl p-8 text-center">
            <h3 className="font-heading text-2xl font-extrabold text-white">
              Don't see your area?
            </h3>
            <p className="text-white/90 mt-2">
              We're expanding fast. Call or WhatsApp us — we might deliver to
              you anyway!
            </p>
            <a
              href="https://wa.me/233599233488"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-4 px-6 py-3 rounded-xl bg-white text-brand-crimson font-extrabold"
            >
              💬 Chat on WhatsApp
            </a>
          </div>
        </div>
      </section>
    </>
  );
}