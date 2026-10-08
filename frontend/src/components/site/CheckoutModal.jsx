"use client";

import { useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/api";
import { useCart } from "./CartContext";
import { useBranch } from "./BranchContext";

export default function CheckoutModal() {
  const { cart, checkoutOpen, setCheckoutOpen, subtotal, clearCart } =
    useCart();
  const { activeBranchId, activeBranch, branches } = useBranch();

  const [zones, setZones] = useState([]);
  const [cust, setCust] = useState({
    full_name: "",
    email: "",
    phone: "",
    delivery_zone_id: "",
    delivery_address: "",
  });
  const [promoInput, setPromoInput] = useState("");
  const [promoApplied, setPromoApplied] = useState(null);
  const [promoError, setPromoError] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [referralInput, setReferralInput] = useState("");
  const [referralMessage, setReferralMessage] = useState("");
  const [referralError, setReferralError] = useState("");
  const [referralApplying, setReferralApplying] = useState(false);
  const [loyalty, setLoyalty] = useState(null);
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [payLoading, setPayLoading] = useState(false);

  const deliveryFee = 15;
  const promoDiscount = promoApplied?.discount_amount || 0;
  const loyaltyDiscount = Math.min(
    redeemPoints * (loyalty ? loyalty.cash_value / (loyalty.points || 1) : 0.01),
    subtotal + deliveryFee
  );
  const total = Math.max(
    subtotal + deliveryFee - promoDiscount - loyaltyDiscount,
    0
  );

  // Load zones when branch changes
  useEffect(() => {
    if (!checkoutOpen || !activeBranchId) return;
    (async () => {
      try {
        const list = await apiGet(
          `/api/v1/delivery-zones?active_only=true&branch_id=${activeBranchId}`
        );
        setZones(list);
        if (list[0]) {
          setCust((p) => ({ ...p, delivery_zone_id: list[0].id }));
        }
      } catch {}
    })();
  }, [checkoutOpen, activeBranchId]);

  // Load loyalty when phone is entered
  useEffect(() => {
    const phone = (cust.phone || "").trim();
    if (phone.length < 9) {
      setLoyalty(null);
      setRedeemPoints(0);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const data = await apiGet(`/api/v1/loyalty/balance/${phone}`);
        setLoyalty(data);
      } catch {
        setLoyalty(null);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [cust.phone]);

  if (!checkoutOpen) return null;

  async function applyPromo() {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoError("");
    try {
      const res = await apiSend("/api/v1/promo-codes/validate", "POST", {
        code: promoInput.trim(),
        phone: cust.phone || null,
        subtotal,
      });
      if (res.valid) {
        setPromoApplied({
          code: res.code,
          discount_amount: res.discount_amount,
          message: res.message,
        });
        setPromoInput("");
      } else {
        setPromoApplied(null);
        setPromoError(res.message);
      }
    } catch (e) {
      setPromoError(e.message);
      setPromoApplied(null);
    } finally {
      setPromoLoading(false);
    }
  }

  async function applyReferral() {
    if (!referralInput.trim()) return;
    setReferralApplying(true);
    setReferralError("");
    setReferralMessage("");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/api/v1/referrals/apply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: referralInput.trim().toUpperCase(),
            referee_phone: cust.phone,
            referee_name: cust.full_name,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");
      setReferralMessage(data.message);
      setReferralInput("");
    } catch (err) {
      setReferralError(err.message);
    } finally {
      setReferralApplying(false);
    }
  }

  async function handleCheckout(e) {
    e.preventDefault();
    if (cart.length === 0) return alert("Your cart is empty");
    if (!cust.delivery_zone_id) return alert("Pick a delivery zone");
    if (!activeBranchId) return alert("Pick a branch");

    setPayLoading(true);
    try {
      const order = await apiSend("/api/v1/orders", "POST", {
        branch_id: activeBranchId,
        customer: {
          full_name: cust.full_name,
          email: cust.email,
          phone: cust.phone,
        },
        delivery_zone_id: cust.delivery_zone_id,
        delivery_address: cust.delivery_address,
        items: cart.map((i) => ({
          item_id: i.item_id,
          name: i.name,
          unit_price: i.unit_price,
          quantity: i.qty,
          is_custom_bowl: i.is_custom_bowl,
          customizations: i.customizations || null,
        })),
        promo_code: promoApplied?.code || null,
        redeem_points: redeemPoints > 0 ? redeemPoints : null,
      });

      const init = await apiSend("/api/v1/payments/initialize", "POST", {
        order_id: order.id,
        email: cust.email,
      });

      clearCart();
      window.location.href = init.authorization_url;
    } catch (err) {
      alert("Checkout error: " + err.message);
    } finally {
      setPayLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={() => setCheckoutOpen(false)}
        className="absolute inset-0 bg-black/80"
      />
      <div className="relative bg-brand-card border border-gray-700 rounded-3xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-gray-700 pb-4 mb-6">
          <div>
            <h3 className="font-heading text-lg font-bold text-white">
              Checkout
            </h3>
            {activeBranch && (
              <p className="text-[11px] text-brand-gold mt-0.5">
                Ordering from: {activeBranch.name}
              </p>
            )}
          </div>
          <button
            onClick={() => setCheckoutOpen(false)}
            className="text-gray-400"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleCheckout} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">
              Full Name
            </label>
            <input
              required
              value={cust.full_name}
              onChange={(e) => setCust({ ...cust, full_name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">
              Email
            </label>
            <input
              required
              type="email"
              value={cust.email}
              onChange={(e) => setCust({ ...cust, email: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">
              Phone
            </label>
            <input
              required
              value={cust.phone}
              onChange={(e) => setCust({ ...cust, phone: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm"
              placeholder="024XXXXXXX"
            />
            {loyalty && loyalty.points > 0 && (
              <div className="mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
                🎁 {loyalty.points} points (GH₵ {loyalty.cash_value.toFixed(2)})
              </div>
            )}
          </div>

          {loyalty && loyalty.points >= loyalty.min_redeem_points && (
            <div className="p-3 rounded-xl bg-brand-dark border border-amber-500/30 space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <input
                  type="checkbox"
                  checked={redeemPoints > 0}
                  onChange={(e) =>
                    setRedeemPoints(
                      e.target.checked
                        ? Math.min(loyalty.points, loyalty.min_redeem_points)
                        : 0
                    )
                  }
                />
                Redeem loyalty points
              </label>
              {redeemPoints > 0 && (
                <input
                  type="range"
                  min={loyalty.min_redeem_points}
                  max={loyalty.points}
                  step={10}
                  value={redeemPoints}
                  onChange={(e) => setRedeemPoints(parseInt(e.target.value))}
                  className="w-full"
                />
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">
              Delivery Zone
            </label>
            <select
              value={cust.delivery_zone_id}
              onChange={(e) =>
                setCust({ ...cust, delivery_zone_id: e.target.value })
              }
              className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm"
            >
              {zones.length === 0 ? (
                <option value="">No zones available</option>
              ) : (
                zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} — GH₵ {z.delivery_fee.toFixed(2)}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">
              Delivery Address
            </label>
            <textarea
              required
              rows={2}
              value={cust.delivery_address}
              onChange={(e) =>
                setCust({ ...cust, delivery_address: e.target.value })
              }
              className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm"
              placeholder="e.g. Pent Block C Room 204, UG Legon"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">
              Promo Code
            </label>
            {promoApplied ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <div className="text-xs">
                  <div className="font-bold text-emerald-400 font-mono">
                    {promoApplied.code}
                  </div>
                  <div className="text-emerald-300 text-[11px]">
                    {promoApplied.message}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPromoApplied(null)}
                  className="text-xs text-red-400"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={promoInput}
                  onChange={(e) =>
                    setPromoInput(e.target.value.toUpperCase())
                  }
                  placeholder="WELCOME10"
                  className="flex-1 px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={applyPromo}
                  disabled={promoLoading || !promoInput.trim()}
                  className="px-4 py-3 rounded-xl bg-brand-gold text-brand-dark font-bold text-xs disabled:opacity-50"
                >
                  {promoLoading ? "…" : "Apply"}
                </button>
              </div>
            )}
            {promoError && (
              <p className="text-xs text-red-400 mt-1">{promoError}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">
              Referral Code (optional)
            </label>
            {referralMessage ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
                {referralMessage}
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={referralInput}
                  onChange={(e) =>
                    setReferralInput(e.target.value.toUpperCase())
                  }
                  placeholder="MRF-XXXXX"
                  className="flex-1 px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={applyReferral}
                  disabled={
                    referralApplying ||
                    !referralInput.trim() ||
                    !cust.phone ||
                    !cust.full_name
                  }
                  className="px-4 py-3 rounded-xl bg-brand-gold text-brand-dark font-bold text-xs disabled:opacity-50"
                >
                  {referralApplying ? "…" : "Apply"}
                </button>
              </div>
            )}
            {referralError && (
              <p className="text-xs text-red-400 mt-1">{referralError}</p>
            )}
          </div>

          <div className="bg-gray-800/80 p-4 rounded-xl text-xs space-y-1.5">
            <div className="flex justify-between text-gray-300">
              <span>Subtotal:</span>
              <span className="font-bold text-white">
                GH₵ {subtotal.toFixed(2)}
              </span>
            </div>
            {promoApplied && (
              <div className="flex justify-between text-emerald-400">
                <span>Promo:</span>
                <span className="font-bold">
                  −GH₵ {promoDiscount.toFixed(2)}
                </span>
              </div>
            )}
            {redeemPoints > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Loyalty:</span>
                <span className="font-bold">
                  −GH₵ {loyaltyDiscount.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-gray-300">
              <span>Delivery:</span>
              <span className="font-bold text-emerald-400">
                GH₵ {deliveryFee.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-brand-gold pt-2 border-t border-gray-700">
              <span>Total:</span>
              <span>GH₵ {total.toFixed(2)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={payLoading || zones.length === 0}
            className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold"
          >
            {payLoading ? "Processing…" : "Confirm & Pay"}
          </button>
        </form>
      </div>
    </div>
  );
}