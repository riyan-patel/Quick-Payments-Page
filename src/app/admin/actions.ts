"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { displayAmountMode } from "@/lib/amounts";
import { formatBrandColorStorage } from "@/lib/brand-color-pair";
import { validateGlCodes, parseGlCodesInput } from "@/lib/gl-codes";
import { createClient } from "@/lib/supabase/server";
import type { AmountMode, FieldType } from "@/types/qpp";

const slugSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only.");

const fieldSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().min(1).max(200),
  field_type: z.enum(["text", "number", "dropdown", "date", "checkbox"]),
  options: z.array(z.string()).optional().default([]),
  required: z.boolean(),
  placeholder: z.string().max(300).optional().nullable(),
  helper_text: z.string().max(500).optional().nullable(),
  sort_order: z.number().int().min(0).max(99),
});

const pageSchema = z.object({
  id: z.string().uuid().optional(),
  slug: slugSchema,
  title: z.string().min(1).max(200),
  subtitle: z.string().max(500).optional().nullable(),
  header_message: z.string().max(2000).optional().nullable(),
  trust_panel: z.string().max(2000).optional().nullable(),
  logo_url: z
    .string()
    .max(2000)
    .transform((s) => s.trim())
    .refine((s) => s === "" || /^https?:\/\/.+/i.test(s), {
      message: "Logo must be a valid http(s) URL or leave blank.",
    })
    .transform((s) => (s === "" ? null : s)),
  brand_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/i, "Use a hex color like #0f766e."),
  brand_color_secondary: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/i, "Use a hex color for the second brand color."),
  amount_mode: z.enum(["fixed", "range", "open"]),
  fixed_amount: z.number().optional().nullable(),
  min_amount: z.number().optional().nullable(),
  max_amount: z.number().optional().nullable(),
  gl_codes_raw: z.string(),
  is_active: z.boolean(),
  email_subject: z.string().max(200).optional().nullable(),
  email_body_html: z.string().max(20000).optional().nullable(),
  payee_notification_email: z
    .string()
    .max(320)
    .transform((s) => s.trim() || null)
    .refine(
      (s) => s == null || z.string().email().safeParse(s).success,
      "Invalid payee notification email.",
    ),
  email_payee_subject: z.string().max(200).optional().nullable(),
  email_payee_body_html: z.string().max(20000).optional().nullable(),
  fields: z.array(fieldSchema).max(10),
});

export type SavePageState = { error?: string };

/** Accept pasted URLs like https://example.com/pay/yoga-class and store yoga-class */
function normalizeSlugInput(raw: string): string {
  let s = raw.trim().toLowerCase();
  if (!s) return s;

  const payMatch = s.match(/(?:^|\/)(?:pay)\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/|$|\?|#)/);
  if (payMatch) return payMatch[1];

  try {
    const href = s.includes("://") ? s : `https://${s}`;
    const u = new URL(href);
    const parts = u.pathname.split("/").filter(Boolean);
    const i = parts.indexOf("pay");
    if (i !== -1 && parts[i + 1]) return parts[i + 1];
  } catch {
    /* not a URL */
  }

  s = s.replace(/^\/+|\/+$/g, "");
  if (s.startsWith("pay/")) s = s.slice(4).replace(/\/$/, "");
  return s;
}

type PaymentPageUpsert = {
  slug: string;
  title: string;
  subtitle: string | null;
  header_message: string | null;
  footer_message: null;
  trust_panel: string | null;
  logo_url: string | null;
  /** Encodes primary + secondary as `#p|#s` in the existing column. */
  brand_color: string;
  amount_mode: AmountMode;
  fixed_amount: number | null;
  min_amount: number | null;
  max_amount: number | null;
  gl_codes: string[];
  is_active: boolean;
  email_subject: string | null;
  email_body_html: string | null;
  payee_notification_email: string | null;
  email_payee_subject: string | null;
  email_payee_body_html: string | null;
};

function validateAmounts(
  mode: AmountMode,
  fixed: number | null | undefined,
  min: number | null | undefined,
  max: number | null | undefined,
): string | null {
  if (mode === "fixed") {
    if (fixed == null || fixed <= 0) return "Fixed amount must be greater than zero.";
    return null;
  }
  if (mode === "range") {
    if (min == null || max == null || min <= 0 || max < min) {
      return "Enter a valid min and max for the range.";
    }
    return null;
  }
  return null;
}

export async function savePaymentPage(_prev: SavePageState, formData: FormData): Promise<SavePageState> {
  const raw = {
    id: (formData.get("id") as string) || undefined,
    slug: normalizeSlugInput(formData.get("slug") as string),
    title: formData.get("title") as string,
    subtitle: (formData.get("subtitle") as string) || null,
    header_message: (formData.get("header_message") as string) || null,
    trust_panel: (formData.get("trust_panel") as string) || null,
    logo_url: (formData.get("logo_url") as string) || "",
    brand_color: formData.get("brand_color") as string,
    brand_color_secondary: formData.get("brand_color_secondary") as string,
    amount_mode: formData.get("amount_mode") as AmountMode,
    fixed_amount: formData.get("fixed_amount")
      ? Number(formData.get("fixed_amount"))
      : null,
    min_amount: formData.get("min_amount") ? Number(formData.get("min_amount")) : null,
    max_amount: formData.get("max_amount") ? Number(formData.get("max_amount")) : null,
    gl_codes_raw: formData.get("gl_codes_raw") as string,
    is_active: formData.get("is_active") === "on",
    email_subject: (formData.get("email_subject") as string) || null,
    email_body_html: (formData.get("email_body_html") as string) || null,
    payee_notification_email: (formData.get("payee_notification_email") as string) ?? "",
    email_payee_subject: (formData.get("email_payee_subject") as string) || null,
    email_payee_body_html: (formData.get("email_payee_body_html") as string) || null,
    fields: JSON.parse((formData.get("fields_json") as string) || "[]") as unknown[],
  };

  const parsed = pageSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(" ") };
  }

  const v = parsed.data;
  const glCodes = parseGlCodesInput(v.gl_codes_raw);
  const glErr = validateGlCodes(glCodes);
  if (glErr) return { error: glErr };

  const amtErr = validateAmounts(v.amount_mode, v.fixed_amount, v.min_amount, v.max_amount);
  if (amtErr) return { error: amtErr };

  for (const f of v.fields) {
    if (f.field_type === "dropdown" && f.options.filter(Boolean).length < 1) {
      return { error: `Dropdown “${f.label}” needs at least one option.` };
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const row: PaymentPageUpsert = {
    slug: v.slug,
    title: v.title,
    subtitle: v.subtitle ?? null,
    header_message: v.header_message ?? null,
    footer_message: null,
    trust_panel: v.trust_panel ?? null,
    logo_url: v.logo_url ?? null,
    brand_color: formatBrandColorStorage(v.brand_color, v.brand_color_secondary),
    amount_mode: v.amount_mode,
    fixed_amount:
      v.amount_mode === "fixed" && v.fixed_amount != null ? v.fixed_amount : null,
    min_amount: v.amount_mode === "range" && v.min_amount != null ? v.min_amount : null,
    max_amount: v.amount_mode === "range" && v.max_amount != null ? v.max_amount : null,
    gl_codes: glCodes,
    is_active: v.is_active,
    email_subject: v.email_subject ?? null,
    email_body_html: v.email_body_html ?? null,
    payee_notification_email: v.payee_notification_email,
    email_payee_subject: v.email_payee_subject ?? null,
    email_payee_body_html: v.email_payee_body_html ?? null,
  };

  let pageId = v.id;

  if (pageId) {
    const { error } = await supabase
      .from("payment_pages")
      .update(row)
      .eq("id", pageId)
      .eq("created_by", user.id);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase
      .from("payment_pages")
      .insert({ ...row, created_by: user.id })
      .select("id")
      .single();
    if (error) return { error: error.message };
    if (!data?.id) return { error: "Could not create page." };
    pageId = data.id;
  }

  const { data: existingFields } = await supabase
    .from("custom_fields")
    .select("id")
    .eq("page_id", pageId!);

  const existingIds = new Set((existingFields ?? []).map((r) => r.id as string));
  const kept = new Set<string>();

  for (const f of v.fields) {
    const options = f.field_type === "dropdown" ? f.options.filter(Boolean) : [];
    if (f.id && existingIds.has(f.id)) {
      kept.add(f.id);
      const { error } = await supabase
        .from("custom_fields")
        .update({
          label: f.label,
          field_type: f.field_type as FieldType,
          options,
          required: f.required,
          placeholder: f.placeholder,
          helper_text: f.helper_text,
          sort_order: f.sort_order,
        })
        .eq("id", f.id)
        .eq("page_id", pageId!);
      if (error) return { error: error.message };
    } else {
      const { data: ins, error } = await supabase
        .from("custom_fields")
        .insert({
          page_id: pageId!,
          label: f.label,
          field_type: f.field_type,
          options,
          required: f.required,
          placeholder: f.placeholder,
          helper_text: f.helper_text,
          sort_order: f.sort_order,
        })
        .select("id")
        .single();
      if (error) return { error: error.message };
      kept.add(ins.id);
    }
  }

  const toRemove = [...existingIds].filter((id) => !kept.has(id));
  if (toRemove.length) {
    await supabase.from("custom_fields").delete().in("id", toRemove);
  }

  revalidatePath("/admin/pages");
  revalidatePath(`/admin/pages/${pageId}/edit`);
  revalidatePath(`/pay/${v.slug}`);
  revalidatePath(`/embed/${v.slug}`);

  redirect(`/admin/pages/${pageId}/edit`);
}

export async function deletePaymentPage(pageId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("payment_pages")
    .delete()
    .eq("id", pageId)
    .eq("created_by", user.id);

  if (error) return { error: error.message };
  revalidatePath("/admin/pages");
  return {};
}

/** For demo / README — human-readable summary of amount mode */
export { displayAmountMode };
