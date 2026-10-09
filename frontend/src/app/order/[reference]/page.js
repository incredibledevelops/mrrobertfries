"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  ChefHat,
  Utensils,
  Bike,
  PartyPopper,
  XCircle,
  Phone,
  Star,
  Camera,
  Loader2,
  Check,
  Home,
  MessageCircle,
} from "lucide-react";
import { API_URL, apiGet, apiSend } from "@/lib/api";
import { getCustomerToken, customerFetch } from "@/lib/customerAuth";
import { OrderTrackingSkeleton } from "@/components/Skeleton";

const STATUS_META = {
  pending: { label: "Pending Payment", color: "text-amber-400", Icon: Clock },
  paid: { label: "Order Confirmed", color: "text-emerald-400", Icon: CheckCircle2 },
  preparing: { label: "Preparing", color: "text-brand-amber", Icon: ChefHat },
  ready: { label: "Ready for Pickup", color: "text-brand-gold", Icon: Utensils },
  out_for_delivery: { label: "On the Way", color: "text-brand-gold", Icon: Bike },
  delivered: { label: "Delivered", color: "text-emerald-400", Icon: PartyPopper },
  cancelled: { label: "Cancelled", color: "text-red-400", Icon: XCircle },
  failed: { label: "Payment Failed", color: "text-red-400", Icon: XCircle },
};

/**
 * Extract the raw order reference from whatever the user landed on:
 *   "MRF-20260101-A4F9K2"              → itself
 *   "MRF-20260101-A4F9K2-PAY-ABCD1234" → strip "-PAY-<nonce>"
 *   "MRF-20260101-A4F9K2-PAY"          → strip legacy "-PAY"
 */
function extractOrderReference(input) {
  if (!input) return "";
  const match = String(input).match(/^(MRF-\d{8}-[A-Z0-9]+)/);
  return match ? match[1] : String(input);
}

function OrderTrackingInner() {
  const params = useParams();
  const search = useSearchParams();
  const rawReference = params.reference || search.get("reference") || "";
  const orderReference = extractOrderReference(rawReference);

  const [order, setOrder] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState("checking");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewPhone, setReviewPhone] = useState("");
  const [reviewPhotoUrls, setReviewPhotoUrls] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);
  const [reviewError, setReviewError] = useState("");

  useEffect(() => {
    async function load() {
      if (!orderReference) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setLoadError("");

      // 1. Load the order itself (this is the authoritative source).
      let orderData = null;
      try {
        orderData = await apiGet(`/api/v1/orders/track/${orderReference}`);
        setOrder(orderData);
      } catch (e) {
        setLoadError(e.message || "Could not load this order.");
        setLoading(false);
        return;
      }

      // 2. Try to confirm payment status, but NEVER let a failed lookup
      //    treat the order as failed.
      try {
        // Payments are stored under "<order>-PAY-<nonce>" (or legacy "<order>-PAY").
        // If the URL didn't include the payment suffix, fall back to the order
        // status as the source of truth.
        const looksLikePaymentRef = /-PAY(-[A-Z0-9]+)?$/.test(rawReference);
        if (looksLikePaymentRef) {
          const verifyRes = await apiGet(
            `/api/v1/payments/verify/${encodeURIComponent(rawReference)}`
          ).catch(() => null);
          if (verifyRes?.status) setPaymentStatus(verifyRes.status);
          else setPaymentStatus("unknown");
        } else {
          setPaymentStatus("unknown");
        }
      } catch {
        setPaymentStatus("unknown");
      }

      setLoading(false);
    }
    load();
  }, [orderReference, rawReference]);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = getCustomerToken();
    if (!token) {
      setReviewError("Please sign in to upload a photo.");
      return;
    }

    setUploading(true);
    setReviewError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("subdir", "menu");

      const res = await customerFetch(`${API_URL}/api/v1/uploads/customer`, {
        method: "POST",
        body: fd,
        // Let the browser set the multipart boundary
        headers: {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Upload failed");
      }
      const data = await res.json();
      const fullUrl = data.url?.startsWith("http")
        ? data.url
        : `${API_URL}${data.url}`;
      setReviewPhotoUrls((prev) => [...prev, fullUrl]);
    } catch (err) {
      setReviewError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function submitReview(e) {
    e.preventDefault();
    if (!order) return;
    setReviewSubmitting(true);
    setReviewError("");
    try {
      await apiSend("/api/v1/reviews", "POST", {
        order_reference: order.reference,
        phone: reviewPhone,
        rating: reviewRating,
        comment: reviewComment || null,
        photo_urls: reviewPhotoUrls,
      });
      setReviewDone(true);
      setReviewOpen(false);
    } catch (err) {
      setReviewError(err.message || "Could not submit review.");
    } finally {
      setReviewSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
        <OrderTrackingSkeleton />
      </div>
    );
  }

  // Only show the red/failed panel when we KNOW it's failed.
  const knownPaymentFailure =
    paymentStatus === "failed" ||
    paymentStatus === "abandoned" ||
    paymentStatus === "cancelled";

  const success = ["success", "paid"].includes(paymentStatus);

  const meta = STATUS_META[order?.status] || STATUS_META.pending;
  const StatusIcon = meta.Icon;

  // Decide the visual state:
  //   - If the payment lookup confirmed failure AND the order isn't already
  //     further along, show the failed panel.
  //   - Otherwise defer to the order status. Never show "failed" just because
  //     the verify lookup 404'd or we didn't have a payment ref.
  const showAsFailed =
    knownPaymentFailure &&
    order &&
    ["pending", "failed"].includes(order.status);

  const headerColor = showAsFailed ? "text-red-400" : meta.color;
  const headerLabel = showAsFailed
    ? "Payment Failed"
    : meta.label;

  return (
    <div className="min-h-screen bg-brand-dark text-gray-100 flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-4">
        <div className="bg-brand-card border border-gray-700 rounded-3xl p-6 sm:p-8">
          {/* Status */}
          <div className="text-center">
            <div
              className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${
                showAsFailed
                  ? "bg-red-500/15"
                  : success
                  ? "bg-emerald-500/15"
                  : "bg-brand-gold/15"
              }`}
            >
              <StatusIcon
                className={`w-10 h-10 ${headerColor}`}
                strokeWidth={2}
                aria-hidden="true"
              />
            </div>
            <h1
              className={`font-heading text-2xl font-extrabold mt-4 ${headerColor}`}
            >
              {headerLabel}
            </h1>
            {loadError && (
              <p className="text-gray-400 text-sm mt-2">{loadError}</p>
            )}
            {!loadError && showAsFailed && (
              <p className="text-gray-400 text-sm mt-2">
                Your payment wasn't completed. You can try again from your cart.
              </p>
            )}
            {!loadError && success && (
              <p className="text-gray-400 text-sm mt-2">
                Medaase! A receipt is on its way to your inbox.
              </p>
            )}
            {!loadError && !success && !showAsFailed && order && (
              <p className="text-gray-400 text-sm mt-2">
                We're tracking your order in real time.
              </p>
            )}
          </div>

          {order && (
            <div className="mt-6 space-y-4 text-sm">
              <div className="p-4 rounded-2xl bg-brand-dark border border-gray-800 space-y-2">
                <Row label="Reference" value={order.reference} mono />
                <Row
                  label="Total"
                  value={`GH₵ ${order.total.toFixed(2)}`}
                  accent
                />
              </div>

              {order.rider_name && (
                <div className="p-4 rounded-xl bg-brand-gold/10 border border-brand-gold/30">
                  <div className="text-[10px] text-brand-gold font-bold uppercase tracking-wider mb-1 inline-flex items-center gap-1.5">
                    <Bike className="w-3.5 h-3.5" aria-hidden="true" />
                    Assigned Rider
                  </div>
                  <div className="text-white font-bold">
                    {order.rider_name}
                  </div>
                  {order.rider_phone && (
                    <a
                      href={`tel:${order.rider_phone}`}
                      className="inline-flex items-center gap-1.5 text-emerald-400 text-xs underline mt-1"
                    >
                      <Phone className="w-3 h-3" aria-hidden="true" />
                      {order.rider_phone}
                    </a>
                  )}
                </div>
              )}

              {/* Progress timeline */}
              <div className="pt-4 border-t border-gray-700">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                  Order Progress
                </div>
                <div className="space-y-3">
                  {(order.status_history || []).map((h, i, arr) => {
                    const isLast = i === arr.length - 1;
                    const histMeta =
                      STATUS_META[h.status] || STATUS_META.pending;
                    const HistIcon = histMeta.Icon;
                    return (
                      <div key={i} className="flex items-start gap-3">
                        <div className="flex flex-col items-center shrink-0">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${
                              isLast
                                ? "border-brand-gold bg-brand-gold/20"
                                : "border-gray-700 bg-brand-dark"
                            }`}
                          >
                            <HistIcon
                              className={`w-3.5 h-3.5 ${
                                isLast ? "text-brand-gold" : "text-gray-500"
                              }`}
                              aria-hidden="true"
                            />
                          </div>
                          {!isLast && <div className="w-px h-6 bg-gray-800" />}
                        </div>
                        <div className="flex-1 pb-1">
                          <div
                            className={`text-sm capitalize font-semibold ${
                              isLast ? "text-white" : "text-gray-400"
                            }`}
                          >
                            {h.status.replace(/_/g, " ")}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {new Date(h.at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Review section */}
        {order && order.status === "delivered" && !reviewDone && (
          <div className="bg-brand-card border border-gray-700 rounded-3xl p-6">
            {!reviewOpen ? (
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center mx-auto">
                  <Star
                    className="w-6 h-6 text-brand-gold fill-brand-gold"
                    aria-hidden="true"
                  />
                </div>
                <h2 className="font-heading text-lg font-extrabold text-white mt-3">
                  How was your meal?
                </h2>
                <p className="text-gray-400 text-xs mt-1">
                  Your feedback helps us improve and helps others discover us.
                </p>
                <button
                  onClick={() => setReviewOpen(true)}
                  className="mt-5 px-6 py-3 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-extrabold text-sm transition-colors"
                >
                  Leave a Review
                </button>
              </div>
            ) : (
              <form onSubmit={submitReview} className="space-y-4">
                <h2 className="font-heading text-lg font-extrabold text-white">
                  Leave a Review
                </h2>

                {reviewError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                    {reviewError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-2">
                    Your rating
                  </label>
                  <div className="flex gap-1 justify-center">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setReviewRating(n)}
                        aria-label={`${n} star${n === 1 ? "" : "s"}`}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-8 h-8 transition-colors ${
                            n <= reviewRating
                              ? "fill-brand-gold text-brand-gold"
                              : "text-gray-700"
                          }`}
                          aria-hidden="true"
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5 inline-flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                    Phone (used to place the order)
                  </label>
                  <input
                    required
                    type="tel"
                    value={reviewPhone}
                    onChange={(e) => setReviewPhone(e.target.value)}
                    placeholder="024XXXXXXX"
                    className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm outline-none focus:border-brand-gold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">
                    Comment (optional)
                  </label>
                  <textarea
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="The loaded fries were amazing!"
                    className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm outline-none focus:border-brand-gold resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5 inline-flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                    Add a photo (optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUpload}
                    disabled={uploading}
                    className="w-full text-white text-xs file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-brand-gold file:text-brand-dark hover:file:bg-brand-amber file:cursor-pointer disabled:opacity-50"
                  />
                  {uploading && (
                    <p className="text-xs text-brand-gold mt-2 inline-flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                      Uploading…
                    </p>
                  )}
                  {reviewPhotoUrls.length > 0 && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {reviewPhotoUrls.map((u, i) => (
                        <img
                          key={i}
                          src={u}
                          alt=""
                          className="w-20 h-20 rounded-lg object-cover border border-gray-700"
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReviewOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-gray-800 text-white font-bold text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reviewSubmitting}
                    className="flex-1 py-3 rounded-xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-extrabold text-sm disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                  >
                    {reviewSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        Sending…
                      </>
                    ) : (
                      "Submit Review"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {reviewDone && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
              <Check
                className="w-7 h-7 text-emerald-400"
                strokeWidth={2.5}
                aria-hidden="true"
              />
            </div>
            <p className="text-emerald-400 font-bold mt-3">
              Medaase for your feedback!
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="w-full py-3 rounded-2xl bg-brand-gold hover:bg-brand-amber text-brand-dark font-bold text-center inline-flex items-center justify-center gap-2 transition-colors"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            Back to Home
          </Link>
          <a
            href="https://wa.me/233599233488"
            className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-center inline-flex items-center justify-center gap-2 transition-colors"
          >
            <MessageCircle className="w-4 h-4" aria-hidden="true" />
            Contact on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono, accent }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400">{label}:</span>
      <span
        className={`${mono ? "font-mono text-xs" : ""} ${
          accent ? "text-brand-gold font-bold" : "text-white font-semibold"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default function OrderTracking() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
          <OrderTrackingSkeleton />
        </div>
      }
    >
      <OrderTrackingInner />
    </Suspense>
  );
}