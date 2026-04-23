import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import type { PaymentPageRow } from "@/types/qpp";

export type InactivePageRow = Pick<
  PaymentPageRow,
  "id" | "title" | "subtitle" | "brand_color" | "brand_color_secondary" | "logo_url" | "is_active" | "slug"
>;

/**
 * RLS only exposes active `payment_pages` to anon. When the slug doesn’t show up as active,
 * we use the service role on the server to tell “missing” vs “exists but disabled”.
 */
export type LoadPublicPaymentPageResult =
  | { kind: "active"; page: PaymentPageRow }
  | { kind: "inactive"; page: InactivePageRow }
  | { kind: "missing" }
  | { kind: "error" };

const inactiveSelect =
  "id, title, subtitle, is_active, brand_color, brand_color_secondary, logo_url, slug" as const;

export async function loadPublicPaymentPage(slug: string): Promise<LoadPublicPaymentPageResult> {
  const pub = createPublicClient();
  const { data: active, error: pubErr } = await pub
    .from("payment_pages")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (pubErr) return { kind: "error" };
  if (active) return { kind: "active", page: active as PaymentPageRow };

  const admin = createAdminClient();
  const { data: check, error: adminErr } = await admin
    .from("payment_pages")
    .select(inactiveSelect)
    .eq("slug", slug)
    .maybeSingle();
  if (adminErr || !check) return { kind: "missing" };

  if (check.is_active) {
    const { data: full, error: fullErr } = await admin
      .from("payment_pages")
      .select("*")
      .eq("id", check.id)
      .single();
    if (fullErr || !full) return { kind: "missing" };
    return { kind: "active", page: full as PaymentPageRow };
  }

  return { kind: "inactive", page: check as InactivePageRow };
}
