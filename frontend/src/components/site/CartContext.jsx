"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("mrf_cart");
      if (raw) setCart(JSON.parse(raw));
    } catch {}
    function onCartUpdate() {
      try {
        const raw = localStorage.getItem("mrf_cart");
        setCart(raw ? JSON.parse(raw) : []);
      } catch {}
    }
    window.addEventListener("mrf-cart-updated", onCartUpdate);
    return () => window.removeEventListener("mrf-cart-updated", onCartUpdate);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("mrf_cart", JSON.stringify(cart));
    } catch {}
  }, [cart]);

  function addToCart(item) {
    setCart((prev) => {
      const existing = prev.find((i) => i.cartId === item.cartId);
      if (existing) {
        return prev.map((i) =>
          i.cartId === item.cartId ? { ...i, qty: i.qty + (item.qty || 1) } : i
        );
      }
      return [...prev, { ...item, qty: item.qty || 1 }];
    });
    setCartOpen(true);
  }

  function updateQty(cartId, delta) {
    setCart((prev) =>
      prev
        .map((i) => (i.cartId === cartId ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0)
    );
  }

  function removeItem(cartId) {
    setCart((prev) => prev.filter((i) => i.cartId !== cartId));
  }

  function clearCart() {
    setCart([]);
    try {
      localStorage.removeItem("mrf_cart");
    } catch {}
  }

  const subtotal = useMemo(
    () => cart.reduce((s, i) => s + i.price * i.qty, 0),
    [cart]
  );
  const count = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);

  const value = {
    cart,
    setCart,
    cartOpen,
    setCartOpen,
    checkoutOpen,
    setCheckoutOpen,
    addToCart,
    updateQty,
    removeItem,
    clearCart,
    subtotal,
    count,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}