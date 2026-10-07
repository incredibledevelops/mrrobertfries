// frontend/app/order/[reference]/page.js
"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { apiGet } from "@/lib/api";

export default function OrderTracking() {
  const params = useParams();
  const search = useSearchParams();
  const reference = params.reference || search.get("reference");

  const [order, setOrder] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState("checking");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verify() {
      if (!reference) return;
      try {
        // Verify the payment
        const verifyRes = await apiGet(`/api/v1/payments/verify/${reference}`);
        setPaymentStatus(verifyRes.status);

        // Fetch order (using order reference; if the payment ref, strip the "-PAY" suffix)
        const orderRef = reference.replace("-PAY", "");
        try {
          const orderRes = await apiGet(`/api/v1/orders/track/${orderRef}`);
          setOrder(orderRes);
        } catch {
          // Order might not be found if ref differs — that's OK
        }
      } catch (e) {
        setPaymentStatus("failed");
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    verify();
  }, [reference]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark text-brand-gold font-bold">
        Verifying your payment...
      </div>
    );
  }

  const success = paymentStatus === "success";

  return (
    <div className="min-h-screen bg-brand-dark text-gray-100 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-brand-card border border-gray-700 rounded-3xl p-8">
        <div className="text-center">
          <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-4xl ${
            success ? "bg-emerald-500/20" : "bg-red-500/20"
          }`}>
            {success ? "✅" : "❌"}
          </div>
          <h1 className="font-heading text-2xl font-extrabold text-white mt-4">
            {success ? "Payment Successful!" : "Payment " + paymentStatus}
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            {success
              ? "Medaase! Your order is being prepared."
              : "Something went wrong. Please try again or call 0599233488."}
          </p>
        </div>

        {order && (
          <div className="mt-8 p-4 rounded-2xl bg-brand-dark border border-gray-700 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Reference:</span>
              <span className="text-white font-bold">{order.reference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Status:</span>
              <span className="text-brand-gold font-bold uppercase">{order.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total:</span>
              <span className="text-white font-bold">GH₵ {order.total.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <a
            href="/"
            className="w-full py-3 rounded-2xl bg-brand-gold text-brand-dark font-bold text-center"
          >
            Back to Home
          </a>
          <a
            href="https://wa.me/233599233488"
            className="w-full py-3 rounded-2xl bg-emerald-600 text-white font-bold text-center"
          >
            Contact on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}