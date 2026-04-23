import type { AmountMode, PaymentPageRow } from "@/types/qpp";

export function toNumber(v: string | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

export function validateAmountForPage(page: PaymentPageRow, amount: number): string | null {
  const a = roundMoney(amount);
  if (a <= 0 || a > 999_999.99) return "Enter a valid payment amount.";

  if (page.amount_mode === "fixed") {
    const fixed = toNumber(page.fixed_amount);
    if (fixed == null) return "This page is misconfigured (fixed amount).";
    if (a !== roundMoney(fixed)) return "Amount must match the fixed price for this page.";
    return null;
  }

  if (page.amount_mode === "range") {
    const min = toNumber(page.min_amount);
    const max = toNumber(page.max_amount);
    if (min == null || max == null) return "This page is misconfigured (amount range).";
    if (a < roundMoney(min) || a > roundMoney(max)) {
      return `Amount must be between ${min.toFixed(2)} and ${max.toFixed(2)}.`;
    }
    return null;
  }

  /* open */
  return null;
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
