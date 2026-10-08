"use client";

import Link from "next/link";
import { useCart } from "./CartContext";
import { useBranch } from "./BranchContext";

export default function CartDrawer() {
  const {
    cart,
    cartOpen,
    setCartOpen,
    updateQty,
    subtotal,
    setCheckoutOpen,
  } = useCart();

  if (!cartOpen) return null;

  const deliveryFee = 15;
  const total = subtotal > 0 ? subtotal + deliveryFee : 0;

  return (
    <div className="fixed inset-0 z-50">
      <div
        onClick={() => setCartOpen(false)}
        className="absolute inset-0 bg-black/70"
      />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-brand-dark border-l border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800 flex justify-between">
          <h3 className="font-heading text-lg font-bold text-white">
            Your Order
          </h3>
          <button onClick={() => setCartOpen(false)} className="text-gray-400">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🛒</div>
              <p className="text-gray-400">Your cart is empty</p>
              <Link
                href="/menu"
                onClick={() => setCartOpen(false)}
                className="inline-block mt-4 px-5 py-2 rounded-xl bg-brand-gold text-brand-dark font-bold text-xs"
              >
                Browse menu
              </Link>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.cartId}
                className="p-4 rounded-2xl bg-brand-card border border-gray-800 flex items-center justify-between gap-3"
              >
                <div className="flex-1">
                  <div className="font-bold text-sm text-white">
                    {item.name}
                  </div>
                  <div className="text-xs text-brand-gold font-bold mt-1">
                    GH₵ {(item.price * item.qty).toFixed(2)}
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-brand-dark px-3 py-1.5 rounded-xl border border-gray-700">
                  <button
                    onClick={() => updateQty(item.cartId, -1)}
                    className="text-gray-400"
                  >
                    −
                  </button>
                  <span className="text-xs font-bold text-white">
                    {item.qty}
                  </span>
                  <button
                    onClick={() => updateQty(item.cartId, 1)}
                    className="text-gray-400"
                  >
                    +
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-6 border-t border-gray-800 space-y-4">
            <div className="flex justify-between text-gray-400 text-sm">
              <span>Subtotal</span>
              <span className="text-white font-semibold">
                GH₵ {subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-gray-400 text-sm">
              <span>Delivery</span>
              <span className="text-emerald-400 font-semibold">
                GH₵ {deliveryFee.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between font-extrabold text-white pt-2 border-t border-gray-700">
              <span>Total</span>
              <span className="text-brand-gold">GH₵ {total.toFixed(2)}</span>
            </div>
            <button
              onClick={() => {
                setCartOpen(false);
                setCheckoutOpen(true);
              }}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold"
            >
              🔒 Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}