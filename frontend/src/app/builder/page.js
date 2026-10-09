"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Home,
  ChevronRight,
  ChefHat,
  Check,
  Utensils,
  Beef,
  Flame,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { useCart } from "@/components/site/CartContext";
import { useBranch } from "@/components/site/BranchContext";
import { BuilderSkeleton } from "@/components/Skeleton";

export default function BuilderPage() {
  const { addToCart } = useCart();
  const { activeBranchId } = useBranch();
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
  const [selectedToppings, setSelectedToppings] = useState([]);
  const [added, setAdded] = useState(false);

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

  function toggleTopping(t) {
    setSelectedToppings((prev) =>
      prev.find((x) => x.id === t.id)
        ? prev.filter((x) => x.id !== t.id)
        : [...prev, t]
    );
  }

  const total = useMemo(() => {
    const base = selectedBase?.price || 0;
    const proteins = selectedProteins.reduce((s, p) => s + (p.price || 0), 0);
    const toppings = selectedToppings.reduce((s, t) => s + (t.price || 0), 0);
    // Sauce is included free; adjust if you want to price it.
    return base + proteins + toppings;
  }, [selectedBase, selectedProteins, selectedToppings]);

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
        toppings: selectedToppings.map((t) => t.name),
        branch_id: activeBranchId || null,
      },
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <>
      {/* Header */}
      <section className="py-10 sm:py-14 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <nav
            className="flex items-center gap-1.5 text-xs text-gray-500 mb-3"
            aria-label="Breadcrumb"
          >
            <Link
              href="/"
              className="inline-flex items-center gap-1 hover:text-brand-gold transition-colors"
            >
              <Home className="w-3 h-3" aria-hidden="true" />
              Home
            </Link>
            <ChevronRight className="w-3 h-3" aria-hidden="true" />
            <span className="text-gray-300">Custom Bowl</span>
          </nav>
          <span className="inline-flex items-center gap-1.5 text-brand-gold font-bold text-xs uppercase tracking-widest bg-brand-gold/10 px-3 py-1 rounded-full border border-brand-gold/20">
            <ChefHat className="w-3.5 h-3.5" aria-hidden="true" />
            DIY Feast
          </span>
          <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-white mt-3">
            Build Your Own Fry Bowl
          </h1>
          <p className="text-gray-400 mt-2 max-w-xl text-sm sm:text-base">
            Pick your base, stack on proteins, choose your sauce. Your perfect
            bowl, your way.
          </p>
        </div>
      </section>

      {/* Builder */}
      <section className="py-10">
        <div className="max-w-4xl mx-auto px-4">
          {loading ? (
            <BuilderSkeleton />
          ) : (
            <div className="bg-brand-card rounded-3xl border border-gray-700 p-6 sm:p-8 space-y-8">
              {/* Step 1: Base */}
              <Step
                icon={Utensils}
                number={1}
                title="Select Base"
                subtitle="Pick one"
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {builder.bases.map((b) => {
                    const active = selectedBase?.id === b.id;
                    return (
                      <button
                        key={b.id}
                        onClick={() => setSelectedBase(b)}
                        aria-pressed={active}
                        className={`relative p-4 rounded-2xl border text-center transition-all ${
                          active
                            ? "border-brand-gold bg-brand-gold/10 shadow-lg shadow-brand-gold/10"
                            : "border-gray-700 bg-brand-dark hover:border-gray-600"
                        }`}
                      >
                        {active && (
                          <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand-gold flex items-center justify-center">
                            <Check
                              className="w-3 h-3 text-brand-dark"
                              strokeWidth={3}
                              aria-hidden="true"
                            />
                          </span>
                        )}
                        <div className="font-bold text-sm text-white">
                          {b.name}
                        </div>
                        <div className="text-xs text-brand-gold mt-1">
                          GH₵ {b.price.toFixed(2)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Step>

              {/* Step 2: Proteins */}
              <Step
                icon={Beef}
                number={2}
                title="Add Proteins"
                subtitle="Pick as many as you like"
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {builder.proteins.map((p) => {
                    const active = selectedProteins.find((x) => x.id === p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => toggleProtein(p)}
                        aria-pressed={!!active}
                        className={`relative p-3.5 rounded-2xl border text-center transition-all ${
                          active
                            ? "border-brand-amber bg-brand-amber/10 shadow-lg shadow-brand-amber/10"
                            : "border-gray-700 bg-brand-dark hover:border-gray-600"
                        }`}
                      >
                        {active && (
                          <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand-amber flex items-center justify-center">
                            <Check
                              className="w-3 h-3 text-brand-dark"
                              strokeWidth={3}
                              aria-hidden="true"
                            />
                          </span>
                        )}
                        <div className="font-bold text-sm text-white">
                          {p.name}
                        </div>
                        <div className="text-xs text-brand-gold mt-0.5">
                          + GH₵ {p.price.toFixed(2)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Step>

              {/* Step 3: Sauce */}
              <Step
                icon={Flame}
                number={3}
                title="Choose Sauce"
                subtitle="Pick one"
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {builder.sauces.map((s) => {
                    const active = selectedSauce?.id === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSelectedSauce(s)}
                        aria-pressed={active}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                          active
                            ? "border-brand-crimson bg-brand-crimson/10 text-white shadow-lg shadow-brand-crimson/10"
                            : "border-gray-700 bg-brand-dark text-white hover:border-gray-600"
                        }`}
                      >
                        {s.name}
                        {s.price > 0 && (
                          <span className="block text-[10px] text-brand-gold mt-0.5">
                            + GH₵ {s.price.toFixed(2)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </Step>

              {/* Step 4: Toppings — now interactive */}
              {builder.toppings?.length > 0 && (
                <Step
                  icon={Sparkles}
                  number={4}
                  title="Toppings"
                  subtitle="Optional — pick as many as you like"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {builder.toppings.map((t) => {
                      const active = selectedToppings.find(
                        (x) => x.id === t.id
                      );
                      return (
                        <button
                          key={t.id}
                          onClick={() => toggleTopping(t)}
                          aria-pressed={!!active}
                          className={`relative p-3 rounded-xl border text-xs font-bold text-white transition-all ${
                            active
                              ? "border-brand-gold bg-brand-gold/10 shadow-lg shadow-brand-gold/10"
                              : "border-gray-700 bg-brand-dark hover:border-gray-600"
                          }`}
                        >
                          {active && (
                            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-brand-gold flex items-center justify-center">
                              <Check
                                className="w-2.5 h-2.5 text-brand-dark"
                                strokeWidth={3}
                                aria-hidden="true"
                              />
                            </span>
                          )}
                          <span className="block">{t.name}</span>
                          <span className="block text-[10px] text-brand-gold mt-0.5">
                            {t.price > 0
                              ? `+ GH₵ ${t.price.toFixed(2)}`
                              : "Free"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Step>
              )}

              {/* Summary + Add */}
              <div className="pt-6 border-t border-gray-700">
                <div className="p-4 rounded-2xl bg-brand-dark border border-gray-700 mb-4 space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                    Your bowl
                  </div>
                  <div className="text-sm text-gray-300 flex flex-wrap gap-x-2 gap-y-1">
                    <span className="text-white font-semibold">
                      {selectedBase?.name}
                    </span>
                    {selectedProteins.length > 0 && (
                      <>
                        <span className="text-gray-600">·</span>
                        <span>{selectedProteins.map((p) => p.name).join(", ")}</span>
                      </>
                    )}
                    {selectedSauce && (
                      <>
                        <span className="text-gray-600">·</span>
                        <span className="text-brand-gold">{selectedSauce.name}</span>
                      </>
                    )}
                    {selectedToppings.length > 0 && (
                      <>
                        <span className="text-gray-600">·</span>
                        <span className="text-brand-amber">
                          {selectedToppings.map((t) => t.name).join(", ")}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-gray-400 block font-semibold uppercase tracking-wider">
                      Total
                    </span>
                    <span className="text-3xl font-black text-brand-gold">
                      GH₵ {total.toFixed(2)}
                    </span>
                  </div>
                  <button
                    onClick={addToCartClick}
                    className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-extrabold inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                      added
                        ? "bg-emerald-600 text-white"
                        : "bg-gradient-to-r from-brand-gold to-brand-amber hover:from-brand-amber hover:to-brand-gold text-brand-dark"
                    }`}
                  >
                    {added ? (
                      <>
                        <Check className="w-5 h-5" aria-hidden="true" />
                        Added to Cart
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-5 h-5" aria-hidden="true" />
                        Add Bowl — GH₵ {total.toFixed(2)}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function Step({ icon: Icon, number, title, subtitle, children }) {
  return (
    <div>
      <h3 className="font-heading font-bold text-white mb-3 inline-flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-gold text-brand-dark text-xs font-black">
          {number}
        </span>
        <Icon className="w-5 h-5 text-brand-gold" aria-hidden="true" />
        {title}
        {subtitle && (
          <span className="text-xs text-gray-500 font-normal">({subtitle})</span>
        )}
      </h3>
      {children}
    </div>
  );
}