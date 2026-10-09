"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Home,
  Tag,
  Gift,
  Award,
  Lock,
  Loader2,
  Check,
  ChevronDown,
  CreditCard,
} from "lucide-react";
import { apiGet, apiSend, randomKey } from "@/lib/api";
import { useCart } from "./CartContext";
import { useBranch } from "./BranchContext";
import { FREE_DELIVERY_THRESHOLD } from "@/lib/constants";

export default function CheckoutModal() {
  const { cart, checkoutOpen, setCheckoutOpen, subtotal, clearCart } = useCart();
  const { activeBranchId, activeBranch } = useBranch();

  const [zones, setZones] = useState([]);
  const [cust, setCust] = useState({
    full_name: "",
    email: "",
    phone: "",
    delivery_zone_id: "",
    delivery_address: "",
  });

  const [showPromo, setShowPromo] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoApplied, setPromoApplied] = useState(null);
  const [promoError, setPromoError] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);

  const [showReferral, setShowReferral] = useState(false);
  const [referralInput, setReferralInput] = useState("");
  const [referralMessage, setReferralMessage] = useState("");
  const [referralError, setReferralError] = useState("");
  const [referralApplying, setReferralApplying] = useState(false);

  const [loyalty, setLoyalty] = useState(null);
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [payLoading, setPayLoading] = useState(false);

  // A stable key for this checkout session. Regenerated whenever the modal
  // opens so a fresh order gets a fresh key, but reused across retries within
  // the same session.
  const idemKeyRef = useRef(null);
  useEffect(() => {
    if (checkoutOpen) idemKeyRef.current = randomKey();
    else idemKeyRef.current = null;
  }, [checkoutOpen]);

  const selectedZone = useMemo(
    () => zones.find((z) => z.id === cust.delivery_zone_id),
    [zones, cust.delivery_zone_id]
  );

  const zoneFee = selectedZone?.delivery_fee ?? 15;
  const freeDeliveryReached =
    FREE_DELIVERY_THRESHOLD > 0 && subtotal >= FREE_DELIVERY_THRESHOLD;
  const deliveryFee = freeDeliveryReached ? 0 : zoneFee;

  const promoDiscount = promoApplied?.discount_amount || 0;

  const pointsToCashRate =
    typeof loyalty?.points_to_cash_rate === "number"
      ? loyalty.points_to_cash_rate
      : 0.01;

  const loyaltyDiscount = useMemo(() => {
    if (!redeemPoints || redeemPoints <= 0) return 0;
    const raw = redeemPoints * pointsToCashRate;
    return Math.min(raw, subtotal + deliveryFee);
  }, [redeemPoints, pointsToCashRate, subtotal, deliveryFee]);

  const total = Math.max(
    subtotal + deliveryFee - promoDiscount - loyaltyDiscount,
    0
  );

  // Load zones
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

  // Escape to close
  useEffect(() => {
    if (!checkoutOpen) return;
    function onKey(e) {
      if (e.key === "Escape" && !payLoading) setCheckoutOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [checkoutOpen, payLoading, setCheckoutOpen]);

  // Scroll lock
  useEffect(() => {
    if (!checkoutOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [checkoutOpen]);

  // Loyalty lookup
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
      // Reuse the same idempotency key across retries within this session.
      const idemKey = idemKeyRef.current || randomKey();
      idemKeyRef.current = idemKey;

      const order = await apiSend(
        "/api/v1/orders",
        "POST",
        {
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
        },
        { idempotencyKey: idemKey }
      );

      const init = await apiSend("/api/v1/payments/initialize", "POST", {
        order_id: order.id,
        email: cust.email,
      });

      clearCart();
      window.location.href = init.authorization_url;
    } catch (err) {
      alert("Checkout error: " + err.message);
      setPayLoading(false);
    }
  }

  if (!checkoutOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-title"
    >
      <div
        onClick={() => !payLoading && setCheckoutOpen(false)}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      <div className="relative bg-brand-card border border-gray-700 rounded-3xl max-w-lg w-full max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-gray-700 p-5">
          <div>
            <h3
              id="checkout-title"
              className="font-heading text-lg font-bold text-white inline-flex items-center gap-2"
            >
              <CreditCard className="w-5 h-5 text-brand-gold" />
              Checkout
            </h3>
            {activeBranch && (
              <p className="text-[11px] text-brand-gold mt-1 inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Ordering from {activeBranch.name}
              </p>
            )}
          </div>
          <button
            onClick={() => !payLoading && setCheckoutOpen(false)}
            disabled={payLoading}
            aria-label="Close checkout"
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable form */}
        <form
          onSubmit={handleCheckout}
          className="flex-1 overflow-y-auto p-5 space-y-5"
        >
          {/* Contact details */}
          <div className="space-y-3">
            <h4 className="text-[11px] uppercase tracking-wider text-gray-500 font-bold">
              Contact
            </h4>

            <Field label="Full Name" icon={User}>
              <input
                required
                autoComplete="name"
                value={cust.full_name}
                onChange={(e) =>
                  setCust({ ...cust, full_name: e.target.value })
                }
                placeholder="Kwadwo Mensah"
                className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm outline-none focus:border-brand-gold"
              />
            </Field>

            <Field label="Email" icon={Mail}>
              <input
                required
                type="email"
                autoComplete="email"
                value={cust.email}
                onChange={(e) => setCust({ ...cust, email: e.target.value })}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm outline-none focus:border-brand-gold"
              />
            </Field>

            <Field label="Phone" icon={Phone}>
              <input
                required
                type="tel"
                autoComplete="tel"
                value={cust.phone}
                onChange={(e) => setCust({ ...cust, phone: e.target.value })}
                placeholder="024XXXXXXX"
                className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm outline-none focus:border-brand-gold"
              />
            </Field>

            {loyalty && loyalty.points > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 inline-flex items-center gap-2 w-full">
                <Award className="w-4 h-4 shrink-0" />
                <span>
                  You have <strong>{loyalty.points} points</strong> (worth GH₵{" "}
                  {loyalty.cash_value.toFixed(2)})
                </span>
              </div>
            )}
          </div>

          {/* Loyalty redemption */}
          {loyalty && loyalty.points >= loyalty.min_redeem_points && (
            <div className="p-4 rounded-xl bg-brand-dark border border-amber-500/30 space-y-3">
              <label className="flex items-center gap-2 text-xs font-bold text-amber-300 cursor-pointer">
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
                  className="accent-brand-gold"
                />
                <Award className="w-4 h-4" />
                Redeem loyalty points
              </label>
              {redeemPoints > 0 && (
                <div>
                  <input
                    type="range"
                    min={loyalty.min_redeem_points}
                    max={loyalty.points}
                    step={10}
                    value={redeemPoints}
                    onChange={(e) => setRedeemPoints(parseInt(e.target.value))}
                    className="w-full accent-brand-gold"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>{loyalty.min_redeem_points} pts min</span>
                    <span className="text-amber-300 font-bold">
                      Using {redeemPoints} pts
                    </span>
                    <span>{loyalty.points} max</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Delivery */}
          <div className="space-y-3">
            <h4 className="text-[11px] uppercase tracking-wider text-gray-500 font-bold">
              Delivery
            </h4>

            <Field label="Delivery Zone" icon={MapPin}>
              <select
                required
                value={cust.delivery_zone_id}
                onChange={(e) =>
                  setCust({ ...cust, delivery_zone_id: e.target.value })
                }
                className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm outline-none focus:border-brand-gold"
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
            </Field>

            <Field label="Delivery Address" icon={Home}>
              <textarea
                required
                rows={2}
                value={cust.delivery_address}
                onChange={(e) =>
                  setCust({ ...cust, delivery_address: e.target.value })
                }
                placeholder="e.g. Pent Block C Room 204, UG Legon"
                className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm outline-none focus:border-brand-gold resize-none"
              />
            </Field>
          </div>

          {/* Promo & Referral */}
          <div className="space-y-3">
            <h4 className="text-[11px] uppercase tracking-wider text-gray-500 font-bold">
              Savings
            </h4>

            {/* Promo */}
            <div className="rounded-xl border border-gray-700 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowPromo((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/40 transition-colors"
              >
                <span className="inline-flex items-center gap-2 text-sm text-white">
                  <Tag className="w-4 h-4 text-brand-gold" />
                  Promo code
                  {promoApplied && (
                    <Check className="w-4 h-4 text-emerald-400" />
                  )}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-gray-500 transition-transform ${
                    showPromo ? "rotate-180" : ""
                  }`}
                />
              </button>
              {showPromo && (
                <div className="px-4 pb-4 space-y-2 border-t border-gray-800">
                  {promoApplied ? (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 mt-3">
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
                        className="text-xs text-red-400 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-3">
                      <input
                        value={promoInput}
                        onChange={(e) =>
                          setPromoInput(e.target.value.toUpperCase())
                        }
                        placeholder="WELCOME10"
                        className="flex-1 px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm font-mono outline-none focus:border-brand-gold"
                      />
                      <button
                        type="button"
                        onClick={applyPromo}
                        disabled={promoLoading || !promoInput.trim()}
                        className="px-4 py-3 rounded-xl bg-brand-gold text-brand-dark font-bold text-xs disabled:opacity-50"
                      >
                        {promoLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Apply"
                        )}
                      </button>
                    </div>
                  )}
                  {promoError && (
                    <p className="text-xs text-red-400">{promoError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Referral */}
            <div className="rounded-xl border border-gray-700 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowReferral((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/40 transition-colors"
              >
                <span className="inline-flex items-center gap-2 text-sm text-white">
                  <Gift className="w-4 h-4 text-brand-gold" />
                  Friend's referral code
                  {referralMessage && (
                    <Check className="w-4 h-4 text-emerald-400" />
                  )}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-gray-500 transition-transform ${
                    showReferral ? "rotate-180" : ""
                  }`}
                />
              </button>
              {showReferral && (
                <div className="px-4 pb-4 space-y-2 border-t border-gray-800">
                  {referralMessage ? (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 mt-3">
                      {referralMessage}
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-3">
                      <input
                        value={referralInput}
                        onChange={(e) =>
                          setReferralInput(e.target.value.toUpperCase())
                        }
                        placeholder="MRF-XXXXX"
                        className="flex-1 px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm font-mono outline-none focus:border-brand-gold"
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
                        {referralApplying ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Apply"
                        )}
                      </button>
                    </div>
                  )}
                  {referralError && (
                    <p className="text-xs text-red-400">{referralError}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-brand-dark p-4 rounded-xl space-y-2 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Subtotal</span>
              <span className="text-white font-semibold">
                GH₵ {subtotal.toFixed(2)}
              </span>
            </div>
            {promoApplied && (
              <div className="flex justify-between text-emerald-400">
                <span className="inline-flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" />
                  {promoApplied.code}
                </span>
                <span className="font-semibold">
                  −GH₵ {promoDiscount.toFixed(2)}
                </span>
              </div>
            )}
            {redeemPoints > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span className="inline-flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  {redeemPoints} pts
                </span>
                <span className="font-semibold">
                  −GH₵ {loyaltyDiscount.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-gray-400">
              <span>Delivery</span>
              <span className="text-emerald-400 font-semibold">
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
            <div className="flex justify-between font-extrabold text-white pt-2 border-t border-gray-700 text-base">
              <span>Total</span>
              <span className="text-brand-gold">GH₵ {total.toFixed(2)}</span>
            </div>
          </div>

          {/* Pay button */}
          <button
            type="submit"
            disabled={payLoading || zones.length === 0}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-extrabold inline-flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
          >
            {payLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Confirm & Pay — GH₵ {total.toFixed(2)}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
        {Icon && <Icon className="w-3.5 h-3.5" aria-hidden="true" />}
        {label}
      </label>
      {children}
    </div>
  );
}