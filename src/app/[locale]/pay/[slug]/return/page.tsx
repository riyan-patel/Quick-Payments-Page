"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function MissingParams({ slug }: { slug: string | undefined }) {
  return (
    <main className="mx-auto max-w-lg px-4 py-16" id="pay-main">
      <div
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-red-900"
      >
        Missing payment information from the payment provider.
      </div>
      <p className="mt-6 text-center">
        <Link className="text-teal-800 underline" href={slug ? `/pay/${slug}` : "/"}>
          {slug ? "Return to payment page" : "Home"}
        </Link>
      </p>
    </main>
  );
}

function ReturnFinalize({ pi, slug }: { pi: string; slug: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      type StoredPayload = {
        amount: number;
        payerEmail: string;
        payerName: string;
        fieldValues: Record<string, string>;
      };
      let stored: StoredPayload | null = null;
      try {
        const raw = sessionStorage.getItem(`qpp-pay:${slug}`);
        if (raw) stored = JSON.parse(raw) as StoredPayload;
      } catch {
        stored = null;
      }

      if (!stored) {
        if (!cancelled) {
          setFailed(true);
          setMessage(
            "We could not restore your checkout details after the redirect. Your payment may still have succeeded — check your email or contact the organization.",
          );
        }
        return;
      }

      try {
        const r = await fetch("/api/payments/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payment_intent_id: pi,
            slug,
            amount: stored.amount,
            payer_email: stored.payerEmail,
            payer_name: stored.payerName,
            field_values: stored.fieldValues,
          }),
        });
        const data = await r.json();
        if (!r.ok) {
          if (!cancelled) {
            setFailed(true);
            setMessage(typeof data.error === "string" ? data.error : "Could not finalize payment.");
          }
          return;
        }
        sessionStorage.removeItem(`qpp-pay:${slug}`);
        if (!cancelled) {
          window.location.replace(`/pay/${slug}/success?id=${encodeURIComponent(data.transaction_id)}`);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
          setMessage("Network error while finalizing your payment.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pi, slug]);

  if (failed) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16" id="pay-main">
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-red-900"
        >
          {message}
        </div>
        <p className="mt-6 text-center">
          <Link className="text-teal-800 underline" href={`/pay/${slug}`}>
            Return to payment page
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center" id="pay-main">
      <p className="text-zinc-700" role="status" aria-live="polite">
        Finalizing your payment…
      </p>
    </main>
  );
}

function ReturnInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string | undefined;
  const pi = searchParams.get("payment_intent");

  if (!pi || !slug) {
    return <MissingParams slug={slug} />;
  }

  return <ReturnFinalize pi={pi} slug={slug} />;
}

export default function PayReturnPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-zinc-700">Loading…</p>
        </main>
      }
    >
      <ReturnInner />
    </Suspense>
  );
}
