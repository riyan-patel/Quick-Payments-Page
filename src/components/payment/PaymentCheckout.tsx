"use client";

import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
import { useCallback, useMemo, useState } from "react";
import { validateCustomFieldResponses } from "@/lib/validate-fields";
import type { AmountMode, CustomFieldRow, PaymentPageRow } from "@/types/qpp";
import { CustomFieldInputs } from "./CustomFieldInputs";
import { toNumber, validateAmountForPage } from "@/lib/amounts";
import clsx from "clsx";

const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

let stripePromise: ReturnType<typeof loadStripe> | null = null;
function getStripe() {
  if (!stripePromise && pk) stripePromise = loadStripe(pk);
  return stripePromise;
}

type Props = {
  page: PaymentPageRow;
  fields: CustomFieldRow[];
  embed?: boolean;
};

function CheckoutForm({
  page,
  slug,
  amount,
  payerEmail,
  payerName,
  fieldValues,
  onFatal,
}: {
  page: PaymentPageRow;
  slug: string;
  amount: number;
  payerEmail: string;
  payerName: string;
  fieldValues: Record<string, string>;
  onFatal: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const pay = async () => {
    if (!stripe || !elements) return;
    setBusy(true);
    setMsg(null);
    try {
      sessionStorage.setItem(
        `qpp-pay:${slug}`,
        JSON.stringify({ amount, payerEmail, payerName, fieldValues }),
      );
    } catch {
      /* ignore storage failures */
    }
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/pay/${slug}/return`,
        receipt_email: payerEmail,
        payment_method_data: {
          billing_details: {
            email: payerEmail,
            name: payerName,
          },
        },
      },
      redirect: "if_required",
    });

    if (error) {
      setMsg(error.message ?? "Payment could not be completed.");
      setBusy(false);
      return;
    }

    if (!paymentIntent || paymentIntent.status !== "succeeded") {
      setMsg("Payment is still processing. Refresh in a moment or check your email.");
      setBusy(false);
      return;
    }

    try {
      const r = await fetch("/api/payments/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_intent_id: paymentIntent.id,
          slug,
          amount,
          payer_email: payerEmail,
          payer_name: payerName,
          field_values: fieldValues,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        onFatal(typeof data.error === "string" ? data.error : "Could not finalize payment.");
        setBusy(false);
        return;
      }
      window.location.href = `/pay/${slug}/success?id=${encodeURIComponent(data.transaction_id)}`;
    } catch {
      onFatal("Network error while saving your payment.");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <PaymentElement
        options={{
          layout: "tabs",
          fields: {
            billingDetails: {
              name: "never",
              email: "never",
            },
          },
        }}
      />
      {msg ? (
        <p role="alert" className="text-sm text-red-800">
          {msg}
        </p>
      ) : null}
      <button
        type="button"
        onClick={pay}
        disabled={busy || !stripe}
        className={clsx(
          "w-full rounded-lg px-4 py-3 text-base font-semibold text-white shadow-sm transition",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
        style={{ backgroundColor: page.brand_color }}
      >
        {busy ? "Processing…" : "Pay securely"}
      </button>
    </div>
  );
}

export function PaymentCheckout({ page, fields, embed }: Props) {
  const slug = page.slug;
  const [amountStr, setAmountStr] = useState(() => {
    if (page.amount_mode === "fixed") return page.fixed_amount ?? "";
    return "";
  });
  const [payerEmail, setPayerEmail] = useState("");
  const [payerName, setPayerName] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stepBusy, setStepBusy] = useState(false);

  const setField = useCallback((id: string, v: string) => {
    setFieldValues((prev) => ({ ...prev, [id]: v }));
  }, []);

  const resolvedAmount = useMemo(() => {
    if (page.amount_mode === "fixed") return toNumber(page.fixed_amount);
    return toNumber(amountStr);
  }, [page.amount_mode, page.fixed_amount, amountStr]);

  const startIntent = async () => {
    setFormError(null);
    setFieldErrors({});

    const fe: Record<string, string> = {};
    for (const f of fields) {
      const v = fieldValues[f.id]?.trim() ?? "";
      fe[f.id] = f.field_type === "checkbox" ? (fieldValues[f.id] ?? "false") : v;
    }

    const ferr = validateCustomFieldResponses(fields, fe);
    if (ferr) {
      setFormError(ferr);
      return;
    }

    const amt = resolvedAmount;
    if (amt == null) {
      setFormError("Enter a valid amount.");
      return;
    }

    const err = validateAmountForPage(page, amt);
    if (err) {
      setFormError(err);
      return;
    }

    if (!payerEmail.trim() || !payerName.trim()) {
      setFormError("Enter your name and a valid email address.");
      return;
    }

    if (!pk) {
      setFormError(
        "Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to .env.local and restart npm run dev — see the yellow box above.",
      );
      return;
    }

    setStepBusy(true);
    try {
      const r = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          amount: amt,
          payer_email: payerEmail.trim(),
          payer_name: payerName.trim(),
          field_values: fe,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setFormError(typeof data.error === "string" ? data.error : "Could not start payment.");
        setStepBusy(false);
        return;
      }
      setClientSecret(data.clientSecret as string);
    } catch {
      setFormError("Network error. Try again.");
    }
    setStepBusy(false);
  };

  const options: StripeElementsOptions = useMemo(
    () => ({
      clientSecret: clientSecret!,
      appearance: {
        theme: "stripe",
        variables: {
          colorPrimary: page.brand_color,
          borderRadius: "8px",
        },
      },
    }),
    [clientSecret, page.brand_color],
  );

  if (fatal) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900"
      >
        {fatal}
      </div>
    );
  }

  if (clientSecret && getStripe()) {
    return (
      <Elements stripe={getStripe()} options={options}>
        <CheckoutForm
          page={page}
          slug={slug}
          amount={resolvedAmount ?? 0}
          payerEmail={payerEmail.trim()}
          payerName={payerName.trim()}
          fieldValues={(() => {
            const fe: Record<string, string> = {};
            for (const f of fields) {
              fe[f.id] =
                f.field_type === "checkbox"
                  ? (fieldValues[f.id] ?? "false")
                  : (fieldValues[f.id]?.trim() ?? "");
            }
            return fe;
          })()}
          onFatal={setFatal}
        />
      </Elements>
    );
  }

  return (
    <form
      className={clsx("space-y-6", embed && "text-sm")}
      onSubmit={(e) => {
        e.preventDefault();
        void startIntent();
      }}
      noValidate
    >
      {!pk ? (
        <div
          role="alert"
          className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4 text-sm text-amber-950 shadow-sm"
        >
          <p className="font-semibold text-amber-950">Finish Stripe setup (test mode)</p>
          <p className="mt-2 text-amber-900/95">
            Your publishable key isn’t in the app yet, so checkout can’t start.
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-amber-950/95">
            <li>
              Open{" "}
              <a
                href="https://dashboard.stripe.com/test/apikeys"
                className="font-medium text-teal-900 underline underline-offset-2"
                target="_blank"
                rel="noopener noreferrer"
              >
                Stripe → Developers → API keys (Test)
              </a>
              .
            </li>
            <li>
              Put <strong>Publishable key</strong>{" "}
              <code className="rounded bg-white/90 px-1.5 py-0.5 text-xs text-zinc-900">
                pk_test_…
              </code>{" "}
              in <code className="rounded bg-white/90 px-1 text-xs text-zinc-900">.env.local</code>{" "}
              as{" "}
              <code className="rounded bg-white/90 px-1 text-xs text-zinc-900">
                NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
              </code>
            </li>
            <li>
              Put <strong>Secret key</strong>{" "}
              <code className="rounded bg-white/90 px-1.5 py-0.5 text-xs text-zinc-900">
                sk_test_…
              </code>{" "}
              as{" "}
              <code className="rounded bg-white/90 px-1 text-xs text-zinc-900">STRIPE_SECRET_KEY=</code>
            </li>
            <li>
              Add <strong>Supabase service role</strong> as{" "}
              <code className="rounded bg-white/90 px-1 text-xs text-zinc-900">
                SUPABASE_SERVICE_ROLE_KEY=
              </code>{" "}
              (Project Settings → API) so successful payments are saved.
            </li>
            <li>
              <strong>Restart</strong>{" "}
              <code className="rounded bg-white/90 px-1 text-xs text-zinc-900">npm run dev</code> —
              Next.js only reads{" "}
              <code className="rounded bg-white/90 px-1 text-xs text-zinc-900">NEXT_PUBLIC_*</code>{" "}
              at startup.
            </li>
          </ol>
        </div>
      ) : null}

      <AmountSection
        mode={page.amount_mode}
        fixedAmount={page.fixed_amount}
        minAmount={page.min_amount}
        maxAmount={page.max_amount}
        amountStr={amountStr}
        onAmountStrChange={setAmountStr}
      />

      <CustomFieldInputs
        fields={fields}
        values={fieldValues}
        onChange={setField}
        errors={fieldErrors}
      />

      <fieldset className="space-y-3 border-0 p-0">
        <legend className="text-base font-semibold text-zinc-900">Your details</legend>
        <div className="space-y-1">
          <label htmlFor="payer-name" className="block text-sm font-medium text-zinc-800">
            Full name <span className="text-red-700">*</span>
          </label>
          <input
            id="payer-name"
            name="payer-name"
            type="text"
            autoComplete="name"
            value={payerName}
            onChange={(e) => setPayerName(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="payer-email" className="block text-sm font-medium text-zinc-800">
            Email for receipt <span className="text-red-700">*</span>
          </label>
          <input
            id="payer-email"
            name="payer-email"
            type="email"
            autoComplete="email"
            value={payerEmail}
            onChange={(e) => setPayerEmail(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          />
        </div>
      </fieldset>

      {formError ? (
        <p role="alert" className="text-sm text-red-800">
          {formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={stepBusy || !pk}
        title={!pk ? "Configure Stripe keys in .env.local first" : undefined}
        className={clsx(
          "w-full rounded-lg px-4 py-3 text-base font-semibold text-white shadow-sm transition",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
        style={{ backgroundColor: page.brand_color }}
      >
        {stepBusy ? "Loading secure checkout…" : "Continue to payment"}
      </button>
    </form>
  );
}

function AmountSection({
  mode,
  fixedAmount,
  minAmount,
  maxAmount,
  amountStr,
  onAmountStrChange,
}: {
  mode: AmountMode;
  fixedAmount: string | null;
  minAmount: string | null;
  maxAmount: string | null;
  amountStr: string;
  onAmountStrChange: (v: string) => void;
}) {
  const min = toNumber(minAmount);
  const max = toNumber(maxAmount);

  if (mode === "fixed") {
    const fa = toNumber(fixedAmount);
    return (
      <section aria-labelledby="amount-heading" className="rounded-lg bg-zinc-50 p-4">
        <h2 id="amount-heading" className="text-sm font-semibold text-zinc-800">
          Amount due
        </h2>
        <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-900">
          {fa != null
            ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                fa,
              )
            : "—"}
        </p>
        <p className="mt-2 text-xs text-zinc-600">
          This amount is set by the organization and cannot be changed here.
        </p>
      </section>
    );
  }

  return (
    <fieldset className="space-y-2 border-0 p-0">
      <legend className="text-base font-semibold text-zinc-900">Payment amount</legend>
      <div className="space-y-1">
        <label htmlFor="pay-amount" className="block text-sm font-medium text-zinc-800">
          {mode === "range"
            ? `Amount (${min != null && max != null ? `$${min.toFixed(2)} – $${max.toFixed(2)}` : "range"})`
            : "Amount (USD)"}
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
            $
          </span>
          <input
            id="pay-amount"
            name="pay-amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min={mode === "range" && min != null ? min : 0.01}
            max={mode === "range" && max != null ? max : undefined}
            value={amountStr}
            onChange={(e) => onAmountStrChange(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 py-2 pl-7 pr-3 text-zinc-900 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            aria-describedby="pay-amount-help"
          />
        </div>
        <p id="pay-amount-help" className="text-xs text-zinc-600">
          {mode === "open"
            ? "Enter the amount you wish to pay."
            : "Enter an amount within the allowed range."}
        </p>
      </div>
    </fieldset>
  );
}
