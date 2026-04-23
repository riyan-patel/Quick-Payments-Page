export type AmountMode = "fixed" | "range" | "open";

export type FieldType = "text" | "number" | "dropdown" | "date" | "checkbox";

export type TransactionStatus = "pending" | "succeeded" | "failed";

export type PaymentPageRow = {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  slug: string;
  title: string;
  subtitle: string | null;
  header_message: string | null;
  /** @deprecated No longer shown or editable; kept for legacy DB rows. */
  footer_message: string | null;
  trust_panel: string | null;
  logo_url: string | null;
  /** Single `#rrggbb` (legacy) or `#primary|#secondary` (both brand colors). */
  brand_color: string;
  /** Optional DB column; pair is also encoded in `brand_color` after save. */
  brand_color_secondary?: string | null;
  amount_mode: AmountMode;
  fixed_amount: string | null;
  min_amount: string | null;
  max_amount: string | null;
  gl_codes: string[];
  is_active: boolean;
  email_subject: string | null;
  email_body_html: string | null;
  /** Optional: receive payee notification here; if null, the page creator’s account email is used. */
  payee_notification_email: string | null;
  email_payee_subject: string | null;
  email_payee_body_html: string | null;
};

/** Subset of `payment_pages` exposed on public /pay and /embed (see `PAYMENT_PAGE_PUBLIC_SELECT`). */
export type PublicPaymentPageRow = Pick<
  PaymentPageRow,
  | "id"
  | "slug"
  | "title"
  | "subtitle"
  | "header_message"
  | "trust_panel"
  | "logo_url"
  | "brand_color"
  | "brand_color_secondary"
  | "amount_mode"
  | "fixed_amount"
  | "min_amount"
  | "max_amount"
  | "gl_codes"
  | "is_active"
>;

export type CustomFieldRow = {
  id: string;
  page_id: string;
  label: string;
  field_type: FieldType;
  options: unknown;
  required: boolean;
  placeholder: string | null;
  helper_text: string | null;
  sort_order: number;
  /** When `field_type` is `number`, optional inclusive min (from DB `numeric`). */
  min_value?: string | null;
  /** When `field_type` is `number`, optional inclusive max (from DB `numeric`). */
  max_value?: string | null;
};

/** Inclusive bounds for number custom fields (used for HTML min/max and validation). */
export function parseNumberFieldBounds(f: CustomFieldRow): { min: number | null; max: number | null } {
  if (f.field_type !== "number") return { min: null, max: null };
  const minRaw = f.min_value;
  const maxRaw = f.max_value;
  const min = minRaw != null && String(minRaw).trim() !== "" ? Number(minRaw) : null;
  const max = maxRaw != null && String(maxRaw).trim() !== "" ? Number(maxRaw) : null;
  return {
    min: min != null && Number.isFinite(min) ? min : null,
    max: max != null && Number.isFinite(max) ? max : null,
  };
}

export type TransactionRow = {
  id: string;
  created_at: string;
  page_id: string;
  amount: string;
  currency: string;
  status: TransactionStatus;
  payment_method_type: string | null;
  payer_email: string | null;
  payer_name: string | null;
  stripe_payment_intent_id: string | null;
  gl_codes_snapshot: string[];
  metadata: Record<string, unknown>;
};

export function parseOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}
