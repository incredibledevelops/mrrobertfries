"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function CallbackInner() {
  const router = useRouter();
  const search = useSearchParams();

  useEffect(() => {
    const reference = search.get("reference") || search.get("trxref");
    if (reference) {
      router.replace(`/order/${reference}`);
    } else {
      router.replace("/");
    }
  }, [router, search]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-dark text-brand-gold">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-4 border-brand-gold/30 border-t-brand-gold animate-spin mx-auto" />
        <p className="mt-4 font-bold text-sm">Verifying payment…</p>
      </div>
    </div>
  );
}

export default function PaystackCallback() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-brand-dark text-brand-gold">
          Loading...
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}