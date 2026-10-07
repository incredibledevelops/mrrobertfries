"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function PaystackCallbackInner() {
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
      Redirecting...
    </div>
  );
}

export default function PaystackCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-brand-dark text-brand-gold">
        Loading...
      </div>
    }>
      <PaystackCallbackInner />
    </Suspense>
  );
}