"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { useCart } from "@/components/site/CartContext";
import { BuilderSkeleton } from "@/components/Skeleton";

export default function BuilderPage() {
  const { addToCart } = useCart();
  const [builder, setBuilder] = useState({
    bases: [],
    proteins: [],
    sauces: [],
    toppings: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedBase, setSelectedBase] = useState(null);
  const [selectedProteins, setSelectedProteins] = useState([]);
  const [selectedSauce, setSelectedSauce] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const b = await apiGet("/api/v1/builder/grouped");
        setBuilder(b);
        if (b.bases[0]) setSelectedBase(b.bases[0]);
        if (b.sauces[0]) setSelectedSauce(b.sauces[0]);
        const def = b.proteins.find((p) => p.is_default);
        if (def) setSelectedProteins([def]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function toggleProtein(p) {
    setSelectedProteins((prev) =>
      prev.find((x) => x.id === p.id)
        ? prev.filter((x) => x.id !== p.id)
        : [...prev, p]
    );
  }

  const total =
    (selectedBase?.price || 0) +
    selectedProteins.reduce((s, p) => s + p.price, 0);

  function addToCartClick() {
    if (!selectedBase || !selectedSauce) {
      alert("Pick a base and a sauce first");
      return;
    }
    addToCart({
      cartId: "bowl-" + Date.now(),
      item_id: null,
      name: `Custom Bowl (${selectedBase.name})`,
      unit_price: total,
      price: total,
      is_custom_bowl: true,
      customizations: {
        base: selectedBase.name,
        proteins: selectedProteins.map((p) => p.name),
        sauce: selectedSauce.name,
      },
    });
  }

  return (
    <>
      {/* Header */}
      <section className="py-12 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="text-xs text-gray-500 mb-3">
            <Link href="/" className="hover:text-brand-gold">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-300">Custom Bowl</span>
          </nav>
          <span className="inline-block text-brand-gold font-bold text-xs uppercase tracking-widest bg-brand-gold/10 px-3 py-1 rounded-full border border-brand-gold/20">
            DIY Feast
          </span>
          <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-white mt-3">
            Build Your Own Fry Bowl
          </h1>
          <p className="text-gray-400 mt-2 max-w-xl">
            Pick your base, stack on proteins, choose your sauce. Your perfect
            bowl, your way.
          </p>
        </div>
      </section>

      {/* Builder */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4">
          {loading ? (
            <BuilderSkeleton />
          ) : (
            <div className="bg-brand-card rounded-3xl border border-gray-700 p-6 space-y-8">
              {/* Base */}
              <div>
                <h3 className="font-heading font-bold text-white mb-3">
                  Step 1: Select Base
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {builder.bases.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBase(b)}
                      className={`p-4 rounded-2xl border text-center transition-colors ${
                        selectedBase?.id === b.id
                          ? "border-brand-gold bg-brand-gold/10"
                          : "border-gray-700 bg-brand-dark hover:border-gray-600"
                      }`}
                    >
                      <div className="font-bold text-sm text-white">
                        {b.name}
                      </div>
                      <div className="text-xs text-brand-gold mt-1">
                        GH₵ {b.price.toFixed(2)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Proteins */}
              <div>
                <h3 className="font-heading font-bold text-white mb-3">
                  Step 2: Add Proteins{" "}
                  <span className="text-xs text-gray-500 font-normal">
                    (pick as many as you like)
                  </span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {builder.proteins.map((p) => {
                    const active = selectedProteins.find((x) => x.id === p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => toggleProtein(p)}
                        className={`p-3.5 rounded-2xl border text-center transition-colors ${
                          active
                            ? "border-brand-amber bg-brand-amber/10"
                            : "border-gray-700 bg-brand-dark hover:border-gray-600"
                        }`}
                      >
                        <div className="font-bold text-sm text-white">
                          {active ? "✓ " : ""}
                          {p.name}
                        </div>
                        <div className="text-xs text-brand-gold mt-0.5">
                          + GH₵ {p.price.toFixed(2)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sauce */}
              <div>
                <h3 className="font-heading font-bold text-white mb-3">
                  Step 3: Choose Sauce
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {builder.sauces.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSauce(s)}
                      className={`p-3 rounded-xl border text-xs font-bold transition-colors ${
                        selectedSauce?.id === s.id
                          ? "border-brand-crimson bg-brand-crimson/10 text-white"
                          : "border-gray-700 bg-brand-dark text-white hover:border-gray-600"
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toppings (if you have any) */}
              {builder.toppings?.length > 0 && (
                <div>
                  <h3 className="font-heading font-bold text-white mb-3">
                    Step 4: Toppings (optional)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {builder.toppings.map((t) => (
                      <div
                        key={t.id}
                        className="p-3 rounded-xl border border-gray-700 bg-brand-dark text-xs font-bold text-white text-center"
                      >
                        {t.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Total + Add */}
              <div className="pt-6 border-t border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-gray-400 block font-semibold">
                    Total Bowl Price:
                  </span>
                  <span className="text-3xl font-black text-brand-gold">
                    GH₵ {total.toFixed(2)}
                  </span>
                  {selectedProteins.length > 0 && (
                    <div className="text-[11px] text-gray-500 mt-1">
                      {selectedProteins.length} protein
                      {selectedProteins.length === 1 ? "" : "s"} +{" "}
                      {selectedBase?.name}
                    </div>
                  )}
                </div>
                <button
                  onClick={addToCartClick}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-gold to-brand-amber text-brand-dark font-extrabold hover:from-brand-amber hover:to-brand-gold transition-all"
                >
                  + Add Custom Bowl — GH₵ {total.toFixed(2)}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}