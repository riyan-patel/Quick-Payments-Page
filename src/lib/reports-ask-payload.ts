import type { PaymentPageRow, TransactionRow } from "@/types/qpp";

export type ReportTx = TransactionRow & {
  payment_pages: Pick<PaymentPageRow, "title" | "slug"> | null;
};

/** One row the model can reason on (names/amounts as on file). */
export type AskTxPayload = {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: string;
  page: string;
  payer_name: string | null;
  payer_email: string | null;
  payment_method: string | null;
};

const MAX_SEND = 5_000;

export function buildAskPayloadFromRows(rows: ReportTx[]): {
  rowCount: number;
  sent: number;
  transactions: AskTxPayload[];
  /** Precomputed from the same rows as `transactions` — use so counts stay exact. */
  aggregates: {
    distinct_payment_method_values: string[];
    distinct_payment_method_count: number;
  };
} {
  const ordered = rows;
  const slice = ordered.length > MAX_SEND ? ordered.slice(0, MAX_SEND) : ordered;
  const methodSet = new Set<string>();
  for (const r of slice) {
    const t = (r.payment_method_type ?? "").trim();
    methodSet.add(t || "unknown");
  }
  const distinctPayment = [...methodSet].sort((a, b) => a.localeCompare(b, "en"));
  return {
    rowCount: rows.length,
    sent: slice.length,
    transactions: slice.map((r) => ({
      id: r.id,
      date: r.created_at,
      amount: Number(r.amount),
      currency: (r.currency ?? "usd").toLowerCase(),
      status: r.status,
      page: r.payment_pages?.title ?? "—",
      payer_name: r.payer_name,
      payer_email: r.payer_email,
      payment_method: r.payment_method_type,
    })),
    aggregates: {
      distinct_payment_method_values: distinctPayment,
      distinct_payment_method_count: distinctPayment.length,
    },
  };
}
