"use client";

import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getCustomFieldValidationError } from "@/lib/validate-fields";
import type { Locale } from "@/i18n/routing";
import { withLocalePath } from "@/lib/locale-path";
import type { AmountMode, CustomFieldRow, PaymentPageRow } from "@/types/qpp";
import { CustomFieldInputs } from "./CustomFieldInputs";
import { getAmountValidationError, toNumber, type AmountValidationError } from "@/lib/amounts";
import { getBrandPair } from "@/lib/brand-color-pair";
import { brandCtaStyle, ctaButtonClassName } from "@/lib/brand-cta-style";
import { validHex6 } from "@/lib/brand-gradient-theme";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import clsx from "clsx";
import { Banknote, CreditCard, UserRound } from "lucide-react";

const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

function formatAmountValidationMessage(
  e: AmountValidationError,
  t: (key: string, values?: Record<string, string>) => string,
) {
  switch (e.code) {
    case "invalid":
      return t("errors.amountInvalid");
    case "fixed_misconfigured":
      return t("errors.amountFixedMisconfigured");
    case "amount_must_match_fixed":
      return t("errors.amountMustMatchFixed");
    case "range_misconfigured":
      return t("errors.amountRangeMisconfigured");
    case "out_of_range":
      return t("errors.amountOutOfRange", {
        min: e.min.toFixed(2),
        max: e.max.toFixed(2),
      });
    default:
      return t("errors.amountInvalid");
  }
}

let stripePromise: ReturnType<typeof loadStripe> | null = null;
function getStripe() {
  if (!stripePromise && pk) stripePromise = loadStripe(pk);
  return stripePromise;
}

function useDocumentDark(): boolean {
  const [isDark, setIsDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );
  useEffect(() => {
    const el = document.documentElement;
    const sync = () => setIsDark(el.classList.contains("dark"));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

const payPayerInputClassName = clsx(
  "h-12 rounded-2xl border border-border/80 bg-input px-4 text-[0.95rem] text-foreground transition-shadow",
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
  "focus-visible:border-primary/30 focus-visible:ring-2 focus-visible:ring-primary/20",
);

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
  const t = useTranslations("pay");
  const locale = useLocale() as Locale;
  const { primary: brandPrimary } = getBrandPair(page);
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
    const returnPath = withLocalePath(locale, `/pay/${slug}/return`);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}${returnPath}`,
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
      setMsg(error.message ?? t("errors.paymentIncomplete"));
      setBusy(false);
      return;
    }

    if (!paymentIntent || paymentIntent.status !== "succeeded") {
      setMsg(t("errors.paymentProcessing"));
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
        onFatal(typeof data.error === "string" ? data.error : t("errors.finalizeFailed"));
        setBusy(false);
        return;
      }
      const successPath = withLocalePath(locale, `/pay/${slug}/success`);
      window.location.href = `${window.location.origin}${successPath}?id=${encodeURIComponent(data.transaction_id)}`;
    } catch {
      onFatal(t("errors.networkSave"));
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 border-t border-foreground/8 pt-6">
      <p className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <CreditCard className="size-3.5 text-foreground/50" strokeWidth={1.75} aria-hidden />
        {t("paymentMethod")}
      </p>
      <div className="rounded-2xl border border-foreground/6 bg-foreground/[0.02] p-1 sm:p-1.5 dark:border-border/50 dark:bg-card/35">
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
      </div>
      {msg ? (
        <Alert variant="destructive">
          <AlertDescription>{msg}</AlertDescription>
        </Alert>
      ) : null}
      <Button
        type="button"
        onClick={pay}
        disabled={busy || !stripe}
        className={ctaButtonClassName}
        style={brandCtaStyle(brandPrimary)}
      >
        {busy ? t("processing") : t("paySecurely")}
      </Button>
    </div>
  );
}

export function PaymentCheckout({ page, fields, embed }: Props) {
  const t = useTranslations("pay");
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

    const ferr = getCustomFieldValidationError(fields, fe, t);
    if (ferr) {
      setFormError(ferr);
      return;
    }

    const amt = resolvedAmount;
    if (amt == null) {
      setFormError(t("errors.amountInvalid"));
      return;
    }

    const amountErr = getAmountValidationError(page, amt);
    if (amountErr) {
      setFormError(formatAmountValidationMessage(amountErr, t));
      return;
    }

    if (!payerEmail.trim() || !payerName.trim()) {
      setFormError(t("errors.nameEmail"));
      return;
    }

    if (!pk) {
      setFormError(t("errors.stripeKey"));
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
        setFormError(typeof data.error === "string" ? data.error : t("errors.startFailed"));
        setStepBusy(false);
        return;
      }
      setClientSecret(data.clientSecret as string);
    } catch {
      setFormError(t("errors.network"));
    }
    setStepBusy(false);
  };

  const { primary: brandPrimary, secondary: brandSecondary } = getBrandPair(page);
  const isDocumentDark = useDocumentDark();

  const options: StripeElementsOptions = useMemo(
    () => ({
      clientSecret: clientSecret!,
      appearance: {
        theme: isDocumentDark ? "night" : "stripe",
        variables: {
          colorPrimary: brandPrimary,
          borderRadius: "14px",
          fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
          spacingUnit: "3px",
        },
        rules: {
          ".Input": isDocumentDark
            ? {
                border: "1px solid oklch(0.38 0.02 90)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.35)",
              }
            : {
                border: "1px solid oklch(0.9 0.012 85)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              },
        },
      },
    }),
    [clientSecret, brandPrimary, isDocumentDark],
  );

  if (fatal) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{fatal}</AlertDescription>
      </Alert>
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
      className={clsx("space-y-8", embed && "text-sm")}
      onSubmit={(e) => {
        e.preventDefault();
        void startIntent();
      }}
      noValidate
    >
      {!pk ? (
        <Alert className="rounded-2xl border-amber-200/80 bg-gradient-to-b from-amber-50/95 to-amber-50/50 text-amber-950 shadow-[0_4px_20px_rgba(245,158,11,0.12)] dark:bg-amber-950/20 dark:text-amber-100">
          <AlertTitle>{t("stripe.title")}</AlertTitle>
          <AlertDescription className="text-amber-950/95 dark:text-amber-100/90">
            <p>{t("stripe.intro")}</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>
                {t("stripe.step1")}{" "}
                <a
                  href="https://dashboard.stripe.com/test/apikeys"
                  className="font-medium text-primary underline underline-offset-2"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("stripe.openDashboard")}
                </a>
                .
              </li>
              <li>
                {t("stripe.step2a")} <strong>{t("stripe.publishableKey")}</strong>{" "}
                <code className="rounded bg-background/90 px-1.5 py-0.5 text-xs text-foreground">
                  pk_test_…
                </code>{" "}
                {t("stripe.step2b")}{" "}
                <code className="rounded bg-background/90 px-1 text-xs text-foreground">.env.local</code>{" "}
                {t("stripe.step2c")}{" "}
                <code className="rounded bg-background/90 px-1 text-xs text-foreground">
                  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
                </code>
              </li>
              <li>
                {t("stripe.step3a")} <strong>{t("stripe.secretKey")}</strong>{" "}
                <code className="rounded bg-background/90 px-1.5 py-0.5 text-xs text-foreground">
                  sk_test_…
                </code>{" "}
                {t("stripe.step2c")}{" "}
                <code className="rounded bg-background/90 px-1 text-xs text-foreground">
                  STRIPE_SECRET_KEY=
                </code>
              </li>
              <li>
                {t("stripe.step4a")} <strong>{t("stripe.supabaseService")}</strong>{" "}
                <code className="rounded bg-background/90 px-1 text-xs text-foreground">
                  SUPABASE_SERVICE_ROLE_KEY=
                </code>{" "}
                {t("stripe.step4b")}
              </li>
              <li>
                <strong>{t("stripe.step5a")}</strong>{" "}
                <code className="rounded bg-background/90 px-1 text-xs text-foreground">npm run dev</code>{" "}
                {t("stripe.step5b")}{" "}
                <code className="rounded bg-background/90 px-1 text-xs text-foreground">NEXT_PUBLIC_*</code>{" "}
                {t("stripe.step5c")}
              </li>
            </ol>
          </AlertDescription>
        </Alert>
      ) : null}

      <AmountSection
        mode={page.amount_mode}
        fixedAmount={page.fixed_amount}
        minAmount={page.min_amount}
        maxAmount={page.max_amount}
        amountStr={amountStr}
        onAmountStrChange={setAmountStr}
        brandColor={brandPrimary}
        brandColorSecondary={brandSecondary}
      />

      <CustomFieldInputs
        fields={fields}
        values={fieldValues}
        onChange={setField}
        errors={fieldErrors}
      />

      <fieldset className="space-y-0 border-0 p-0">
        <legend className="flex w-full items-center gap-2 px-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <UserRound className="size-3.5 text-foreground/50" strokeWidth={1.75} aria-hidden />
          {t("yourDetails")}
        </legend>
        <div className="mt-4 rounded-2xl border border-foreground/8 bg-gradient-to-b from-card to-muted/15 p-5 shadow-sm ring-1 ring-foreground/5 sm:p-6">
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="payer-name" className="text-sm font-medium text-foreground/90">
                {t("fullName")} <span className="text-destructive">{t("requiredMark")}</span>
              </Label>
              <Input
                id="payer-name"
                name="payer-name"
                type="text"
                autoComplete="name"
                className={payPayerInputClassName}
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payer-email" className="text-sm font-medium text-foreground/90">
                {t("emailReceipt")} <span className="text-destructive">{t("requiredMark")}</span>
              </Label>
              <Input
                id="payer-email"
                name="payer-email"
                type="email"
                autoComplete="email"
                className={payPayerInputClassName}
                value={payerEmail}
                onChange={(e) => setPayerEmail(e.target.value)}
              />
            </div>
          </div>
        </div>
      </fieldset>

      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <Button
        type="submit"
        disabled={stepBusy || !pk}
        title={!pk ? t("configureStripeTitle") : undefined}
        className={ctaButtonClassName}
        style={brandCtaStyle(brandPrimary)}
      >
        {stepBusy ? t("loadingCheckout") : t("continueToPayment")}
      </Button>
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
  brandColor,
  brandColorSecondary,
}: {
  mode: AmountMode;
  fixedAmount: string | null;
  minAmount: string | null;
  maxAmount: string | null;
  amountStr: string;
  onAmountStrChange: (v: string) => void;
  brandColor: string;
  brandColorSecondary: string;
}) {
  const t = useTranslations("pay");
  const locale = useLocale();
  const min = toNumber(minAmount);
  const max = toNumber(maxAmount);
  const numberLocale = locale === "es" ? "es-ES" : "en-US";

  if (mode === "fixed") {
    const p = validHex6(brandColor, "#0f766e");
    const s = validHex6(brandColorSecondary, "#f59e0b");
    const fa = toNumber(fixedAmount);
    return (
      <div
        className="space-y-2 rounded-2xl border border-foreground/8 bg-gradient-to-b from-card/90 to-muted/20 p-5 shadow-sm ring-1 ring-foreground/5 sm:p-6"
        style={{ borderLeftWidth: 4, borderLeftColor: p, borderLeftStyle: "solid" }}
      >
        <h2
          id="amount-heading"
          className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.2em]"
          style={{ color: s }}
        >
          <Banknote className="size-3.5 shrink-0" style={{ color: s }} strokeWidth={1.75} aria-hidden />
          {t("amountDue")}
        </h2>
        <p className="pay-font-display text-3xl font-bold leading-none tracking-tight text-foreground tabular-nums sm:text-4xl">
          {fa != null
            ? new Intl.NumberFormat(numberLocale, { style: "currency", currency: "USD" }).format(fa)
            : "—"}
        </p>
        <p className="text-sm text-muted-foreground">
          {t("amountFixed")}
        </p>
      </div>
    );
  }

  const minStr =
    min != null
      ? new Intl.NumberFormat(numberLocale, { style: "currency", currency: "USD" }).format(min)
      : null;
  const maxStr =
    max != null
      ? new Intl.NumberFormat(numberLocale, { style: "currency", currency: "USD" }).format(max)
      : null;

  return (
    <fieldset className="space-y-3 border-0 p-0">
      <legend className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <Banknote className="size-3.5 text-foreground/50" strokeWidth={1.75} aria-hidden />
        {t("paymentAmount")}
      </legend>
      <div className="space-y-2">
        <Label htmlFor="pay-amount" className="text-foreground/90">
          {mode === "range" && minStr != null && maxStr != null
            ? t("amountInRange", { min: minStr, max: maxStr })
            : t("amountUsd")}
        </Label>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-4 z-10 -translate-y-1/2 text-sm font-medium text-muted-foreground">
            $
          </span>
          <Input
            id="pay-amount"
            name="pay-amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min={mode === "range" && min != null ? min : 0.01}
            max={mode === "range" && max != null ? max : undefined}
            value={amountStr}
            onChange={(e) => onAmountStrChange(e.target.value)}
            className="h-12 rounded-2xl border border-border/80 bg-input pl-8 text-base font-medium text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            aria-describedby="pay-amount-help"
          />
        </div>
        <p id="pay-amount-help" className="text-xs text-muted-foreground">
          {mode === "open" ? t("openHelp") : t("rangeHelp")}
        </p>
      </div>
    </fieldset>
  );
}
