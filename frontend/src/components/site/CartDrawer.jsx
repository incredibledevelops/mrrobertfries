"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ShoppingBag,
  X,
  Minus,
  Plus,
  Trash2,
  Lock,
  UtensilsCrossed,
  Truck,
  Sparkles,
} from "lucide-react";
import { useCart } from "./CartContext";
import { useBranch } from "./BranchContext";
import { apiGet } from "@/lib/api";
import { FREE_DELIVERY_THRESHOLD } from "@/lib/constants";

export default function CartDrawer() {
  const {
    cart,
    cartOpen,
    setCartOpen,
    updateQty,
    removeItem,
    subtotal,
    setCheckoutOpen,
  } = useCart();
  const { activeBranchId } = useBranch();
  const [zones, setZones] = useState([]);
  const [selectedZoneId, setSelectedZoneId] = useState("");

  // Fetch zones when drawer opens
  useEffect(() => {
    if (!cartOpen || !activeBranchId) return;
    (async () => {
      try {
        const list = await apiGet(
          `/api/v1/delivery-zones?active_only=true&branch_id=${activeBranchId}`
        );
        setZones(list);
        setSelectedZoneId((prev) => prev || list[0]?.id || "");
      } catch {}
    })();
  }, [cartOpen, activeBranchId]);

  // Close on Escape
  useEffect(() => {
    if (!cartOpen) return;
    function onKey(e) {
      if (e.key === "Escape") setCartOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cartOpen, setCartOpen]);

  // Lock scroll while open
  useEffect(() => {
    if (!cartOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [cartOpen]);

  const selectedZone = zones.find((z) => z.id === selectedZoneId);
  const zoneFee = selectedZone?.delivery_fee ?? 15;

  // Free delivery is threshold-based and mirrors the backend rule exactly.
  const freeDeliveryReached =
    FREE_DELIVERY_THRESHOLD > 0 && subtotal >= FREE_DELIVERY_THRESHOLD;
  const deliveryFee = freeDeliveryReached ? 0 : zoneFee;
  const total = subtotal > 0 ? subtotal + deliveryFee : 0;

  const freeDeliveryProgress = FREE_DELIVERY_THRESHOLD > 0
    ? Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100)
    : 0;

  if (!cartOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-title"
    >
      <div
        onClick={() => setCartOpen(false)}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]"
      />
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slideIn 250ms cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>

      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-brand-dark border-l border-gray-800 flex flex-col animate-slide-in">
        {/* Header */}
        <div className="p-5 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-brand-gold" aria-hidden="true" />
            <h3 id="cart-title" className="font-heading text-lg font-bold text-white">
              Your Order
            </h3>
            {cart.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold font-bold">
                {cart.reduce((s, i) => s + i.qty, 0)}
              </span>
            )}
          </div>
          <button
            onClick={() => setCartOpen(false)}
            aria-label="Close cart"
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-20 h-20 rounded-full bg-brand-card border border-gray-800 flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-8 h-8 text-gray-600" aria-hidden="true" />
              </div>
              <h4 className="text-white font-bold mb-1">Your cart is empty</h4>
              <p className="text-gray-500 text-sm mb-6">
                Add some loaded fries to get started.
              </p>
              <Link
                href="/menu"
                onClick={() => setCartOpen(false)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-gold text-brand-dark font-bold text-xs hover:bg-brand-amber transition-colors"
              >
                <UtensilsCrossed className="w-4 h-4" />
                Browse menu
              </Link>
            </div>
          ) : (
            <>
              {/* Free delivery progress */}
              {FREE_DELIVERY_THRESHOLD > 0 && (
                <div className="px-5 pt-4">
                  {freeDeliveryReached ? (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 inline-flex items-center gap-2 w-full">
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span>You've unlocked free delivery!</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-gray-400">
                          Add GH₵{" "}
                          {(FREE_DELIVERY_THRESHOLD - subtotal).toFixed(2)} for
                          free delivery
                        </span>
                        <span className="text-brand-gold font-bold">
                          {Math.round(freeDeliveryProgress)}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-amber to-brand-gold transition-all duration-500"
                          style={{ width: `${freeDeliveryProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="p-5 space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.cartId}
                    className="group p-3 rounded-2xl bg-brand-card border border-gray-800 hover:border-gray-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-white truncate">
                          {item.name}
                        </div>
                        {item.customizations && (
                          <div className="text-[10px] text-gray-500 mt-0.5 truncate">
                            {item.customizations.base}
                            {item.customizations.proteins?.length > 0 &&
                              ` · ${item.customizations.proteins.join(", ")}`}
                          </div>
                        )}
                        <div className="text-xs text-brand-gold font-bold mt-1">
                          GH₵ {(item.price * item.qty).toFixed(2)}
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(item.cartId)}
                        aria-label={`Remove ${item.name} from cart`}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="inline-flex items-center gap-1 bg-brand-dark px-1 py-1 rounded-xl border border-gray-700">
                        <button
                          onClick={() => updateQty(item.cartId, -1)}
                          aria-label={`Decrease quantity of ${item.name}`}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold text-white w-6 text-center">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => updateQty(item.cartId, 1)}
                          aria-label={`Increase quantity of ${item.name}`}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="border-t border-gray-800 bg-brand-card/40 p-5 space-y-3">
            {/* Zone selector */}
            {zones.length > 0 && (
              <div>
                <label
                  htmlFor="cart-zone"
                  className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5"
                >
                  <Truck className="inline w-3 h-3 mr-1" aria-hidden="true" />
                  Deliver to
                </label>
                <select
                  id="cart-zone"
                  value={selectedZoneId}
                  onChange={(e) => setSelectedZoneId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-gray-700 text-white text-xs outline-none focus:border-brand-gold"
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} — GH₵ {z.delivery_fee.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span className="text-white font-semibold">
                  GH₵ {subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Delivery</span>
                <span
                  className={
                    freeDeliveryReached
                      ? "text-emerald-400 font-semibold"
                      : "text-emerald-400 font-semibold"
                  }
                >
                  {freeDeliveryReached ? (
                    <>
                      <span className="text-gray-500 line-through mr-1.5">
                        GH₵ {zoneFee.toFixed(2)}
                      </span>
                      FREE
                    </>
                  ) : (
                    <>GH₵ {deliveryFee.toFixed(2)}</>
                  )}
                </span>
              </div>
              <div className="flex justify-between font-extrabold text-white pt-2 border-t border-gray-700">
                <span>Total</span>
                <span className="text-brand-gold text-base">
                  GH₵ {total.toFixed(2)}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setCartOpen(false);
                setCheckoutOpen(true);
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold inline-flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
            >
              <Lock className="w-4 h-4" aria-hidden="true" />
              Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}