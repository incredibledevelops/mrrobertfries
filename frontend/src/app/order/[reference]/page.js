"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { apiGet, apiSend } from "@/lib/api";
import { OrderTrackingSkeleton } from "@/components/Skeleton";

const STATUS_LABELS = {
  pending: { label: "Pending Payment", color: "text-amber-400", emoji: "⏳" },
  paid: { label: "Paid", color: "text-emerald-400", emoji: "✅" },
  preparing: { label: "Preparing", color: "text-brand-amber", emoji: "👨‍🍳" },
  ready: { label: "Ready", color: "text-brand-gold", emoji: "🍟" },
  out_for_delivery: { label: "On the Way", color: "text-brand-gold", emoji: "🛵" },
  delivered: { label: "Delivered", color: "text-emerald-400", emoji: "🎉" },
  cancelled: { label: "Cancelled", color: "text-red-400", emoji: "❌" },
  failed: { label: "Payment Failed", color: "text-red-400", emoji: "❌" },
};

function OrderTrackingInner() {
  const params = useParams();
  const search = useSearchParams();
  const reference = params.reference || search.get("reference");

  const [order, setOrder] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState("checking");
  const [loading, setLoading] = useState(true);

  // Review form
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewPhone, setReviewPhone] = useState("");
  const [reviewPhotoUrls, setReviewPhotoUrls] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);

  useEffect(() => {
    async function load() {
      if (!reference) return;
      try {
        const verifyRes = await apiGet(`/api/v1/payments/verify/${reference}`).catch(() => null);
        if (verifyRes) setPaymentStatus(verifyRes.status);

        const orderRef = reference.replace("-PAY", "");
        try {
          const orderRes = await apiGet(`/api/v1/orders/track/${orderRef}`);
          setOrder(orderRes);
        } catch {
          // not found — ok
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [reference]);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("subdir", "menu"); // reuse existing folder
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/api/v1/uploads`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      const fullUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}${data.url}`;
      setReviewPhotoUrls(prev => [...prev, fullUrl]);
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function submitReview(e) {
    e.preventDefault();
    if (!order) return;
    setReviewSubmitting(true);
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
      alert(err.message);
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

  const success = paymentStatus === "success";
  const meta = STATUS_LABELS[order?.status] || STATUS_LABELS.pending;

  return (
    <div className="min-h-screen bg-brand-dark text-gray-100 flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-4">
        <div className="bg-brand-card border border-gray-700 rounded-3xl p-8">
          <div className="text-center">
            <div className="text-5xl">{meta.emoji}</div>
            <h1 className={`font-heading text-2xl font-extrabold mt-3 ${meta.color}`}>
              {meta.label}
            </h1>
            {!success && paymentStatus !== "checking" && (
              <p className="text-gray-400 text-sm mt-2">
                Payment status: {paymentStatus}
              </p>
            )}
            {success && (
              <p className="text-gray-400 text-sm mt-2">
                Medaase! A receipt is on its way to your inbox.
              </p>
            )}
          </div>

          {order && (
            <div className="mt-8 space-y-3 text-sm">
              <Row label="Reference" value={order.reference} mono />
              <Row label="Total" value={`GH₵ ${order.total.toFixed(2)}`} accent />

              {order.rider_name && (
                <div className="p-3 rounded-xl bg-brand-gold/10 border border-brand-gold/30">
                  <div className="text-xs text-brand-gold font-bold uppercase">
                    Assigned Rider
                  </div>
                  <div className="text-white font-bold mt-1">
                    {order.rider_name}
                  </div>
                  {order.rider_phone && (
                    <a
                      href={`tel:${order.rider_phone}`}
                      className="text-emerald-400 text-xs underline"
                    >
                      📞 {order.rider_phone}
                    </a>
                  )}
                </div>
              )}

              {/* Progress */}
              <div className="pt-4 border-t border-gray-700">
                <div className="text-xs font-bold text-gray-400 uppercase mb-3">
                  Order Progress
                </div>
                <div className="space-y-2 text-xs">
                  {(order.status_history || []).map((h, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-brand-gold mt-1.5" />
                      <div className="flex-1">
                        <div className="text-white capitalize">
                          {h.status.replace(/_/g, " ")}
                        </div>
                        <div className="text-gray-500">
                          {new Date(h.at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Review section */}
        {order && order.status === "delivered" && !reviewDone && (
          <div className="bg-brand-card border border-gray-700 rounded-3xl p-6 text-center">
            <div className="text-2xl">⭐</div>
            <h2 className="font-heading text-lg font-extrabold text-white mt-2">
              How was your meal?
            </h2>
            <p className="text-gray-400 text-xs mt-1">
              Your feedback helps us improve and helps others discover us.
            </p>
            {!reviewOpen ? (
              <button
                onClick={() => setReviewOpen(true)}
                className="mt-4 px-6 py-3 rounded-xl bg-brand-gold text-brand-dark font-extrabold"
              >
                Leave a Review
              </button>
            ) : (
              <form onSubmit={submitReview} className="mt-6 text-left space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-2">
                    Your rating
                  </label>
                  <div className="flex gap-1 justify-center">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setReviewRating(n)}
                        className={`text-3xl ${
                          n <= reviewRating ? "text-brand-gold" : "text-gray-600"
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    Phone (used to place the order)
                  </label>
                  <input
                    required
                    value={reviewPhone}
                    onChange={e => setReviewPhone(e.target.value)}
                    placeholder="024XXXXXXX"
                    className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    Comment (optional)
                  </label>
                  <textarea
                    rows={3}
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                    placeholder="The loaded fries were amazing!"
                    className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-gray-700 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    Add a photo (optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUpload}
                    className="w-full text-white text-xs"
                  />
                  {uploading && (
                    <p className="text-xs text-brand-gold mt-1">Uploading…</p>
                  )}
                  {reviewPhotoUrls.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {reviewPhotoUrls.map((u, i) => (
                        <img
                          key={i}
                          src={u}
                          className="w-20 h-20 rounded-lg object-cover border border-gray-700"
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
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
                    className="flex-1 py-3 rounded-xl bg-brand-gold text-brand-dark font-extrabold text-sm disabled:opacity-50"
                  >
                    {reviewSubmitting ? "Sending…" : "Submit Review"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {reviewDone && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-6 text-center">
            <div className="text-2xl">🙏</div>
            <p className="text-emerald-400 font-bold mt-2">
              Medaase for your feedback!
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
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

function Row({ label, value, mono, accent }) {
  return (
    <div className="flex justify-between">
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