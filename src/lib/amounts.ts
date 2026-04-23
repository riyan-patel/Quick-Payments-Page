import type { AmountMode, PaymentPageRow } from "@/types/qpp";

/** Amount fields only — shared by full `PaymentPageRow` and `PublicPaymentPageRow`. */
export type AmountPageConfig = Pick<
  PaymentPageRow,
  "amount_mode" | "fixed_amount" | "min_amount" | "max_amount"
>;

export function toNumber(v: string | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

export type AmountValidationError =
  | { code: "invalid" }
  | { code: "fixed_misconfigured" }
  | { code: "amount_must_match_fixed" }
  | { code: "range_misconfigured" }
  | { code: "out_of_range"; min: number; max: number };

/**
 * Structured validation for payment amount (use with i18n on the client, or
 * {@link validateAmountForPage} for English strings on the server and API.
 */
export function getAmountValidationError(
  page: AmountPageConfig,
  amount: number,
): AmountValidationError | null {
  const a = roundMoney(amount);
  if (a <= 0 || a > 999_999.99) return { code: "invalid" };

  if (page.amount_mode === "fixed") {
    const fixed = toNumber(page.fixed_amount);
    if (fixed == null) return { code: "fixed_misconfigured" };
    if (a !== roundMoney(fixed)) return { code: "amount_must_match_fixed" };
    return null;
  }

  if (page.amount_mode === "range") {
    const min = toNumber(page.min_amount);
    const max = toNumber(page.max_amount);
    if (min == null || max == null) return { code: "range_misconfigured" };
    if (a < roundMoney(min) || a > roundMoney(max)) {
      return { code: "out_of_range", min, max };
    }
    return null;
  }

  return null;
}

function formatAmountValidationErrorEn(e: AmountValidationError): string {
  switch (e.code) {
    case "invalid":
      return "Enter a valid payment amount.";
    case "fixed_misconfigured":
      return "This page is misconfigured (fixed amount).";
    case "amount_must_match_fixed":
      return "Amount must match the fixed price for this page.";
    case "range_misconfigured":
      return "This page is misconfigured (amount range).";
    case "out_of_range":
      return `Amount must be between ${e.min.toFixed(2)} and ${e.max.toFixed(2)}.`;
    default:
      return "Enter a valid payment amount.";
  }
}

export function validateAmountForPage(page: AmountPageConfig, amount: number): string | null {
  const e = getAmountValidationError(page, amount);
  return e ? formatAmountValidationErrorEn(e) : null;
}

export function displayAmountMode(mode: AmountMode) {
  switch (mode) {
    case "fixed":
      return "Fixed amount";
    case "range":
      return "Min / max range";
    case "open":
      return "Payer enters amount";
    default:
      return mode;
  }
}
