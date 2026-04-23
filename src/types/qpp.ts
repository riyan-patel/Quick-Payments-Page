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
  footer_message: string | null;
  trust_panel: string | null;
  logo_url: string | null;
  brand_color: string;
  amount_mode: AmountMode;
  fixed_amount: string | null;
  min_amount: string | null;
  max_amount: string | null;
  gl_codes: string[];
  is_active: boolean;
  email_subject: string | null;
  email_body_html: string | null;
};

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
};

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
