"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";

/**
 * Given a Paystack reference (either the legacy "<order>-PAY" or the new
 * "<order>-PAY-<nonce>" form), return the order reference. Falls back to
 * the input if no pattern matches.
 */
function extractOrderReference(input) {
  if (!input) return "";
  const match = String(input).match(/^(MRF-\d{8}-[A-Z0-9]+)/);
  return match ? match[1] : String(input);
}

function CallbackInner() {
  const router = useRouter();
  const search = useSearchParams();

  useEffect(() => {
    const reference = search.get("reference") || search.get("trxref");
    if (reference) {
      const orderRef = extractOrderReference(reference);
      router.replace(`/order/${orderRef}?reference=${encodeURIComponent(reference)}`);
    } else {
      router.replace("/");
    }
  }, [router, search]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-dark p-4">
      <div className="text-center">
        <div className="relative mx-auto w-16 h-16">
          <Loader2
            className="w-16 h-16 text-brand-gold animate-spin"
            strokeWidth={2}
            aria-hidden="true"
          />
          <ShieldCheck
            className="w-6 h-6 text-brand-gold absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
        </div>
        <p className="mt-5 font-heading font-bold text-white">
          Verifying payment…
        </p>
        <p className="text-xs text-gray-500 mt-1">
          This usually takes just a few seconds
        </p>
      </div>
    </div>
  );
}

export default function PaystackCallback() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-brand-dark">
          <Loader2
            className="w-10 h-10 text-brand-gold animate-spin"
            aria-hidden="true"
          />
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}