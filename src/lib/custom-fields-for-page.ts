import type { SupabaseClient } from "@supabase/supabase-js";
import type { CustomFieldRow } from "@/types/qpp";

const CUSTOM_FIELDS_WITH_BOUNDS =
  "id, page_id, label, field_type, options, required, placeholder, helper_text, sort_order, min_value, max_value";
const CUSTOM_FIELDS_BASE =
  "id, page_id, label, field_type, options, required, placeholder, helper_text, sort_order";

function isPgrstBoundsOrCacheError(err: { message?: string } | null | undefined): boolean {
  const m = (err?.message ?? "").toLowerCase();
  if (m.includes("schema cache") && (m.includes("max_value") || m.includes("min_value")))
    return true;
  if (
    m.includes("custom_fields") &&
    (m.includes("max_value") || m.includes("min_value"))
  )
    return true;
  return false;
}

/** Exposed for server actions to retry without bounds columns. */
export function isCustomFieldsPostgrestCacheError(err: {
  message?: string;
} | null | undefined): boolean {
  return isPgrstBoundsOrCacheError(err);
}

/**
 * Load custom fields for a page. If PostgREST’s schema cache is stale (new columns
 * not visible), falls back to a select without min/max so the app still works;
 * run `NOTIFY pgrst, 'reload schema';` in Supabase SQL to fix fully.
 */
export async function getCustomFieldsForPage(
  supabase: SupabaseClient,
  pageId: string,
): Promise<{ data: CustomFieldRow[] }> {
  const r1 = await supabase
    .from("custom_fields")
    .select(CUSTOM_FIELDS_WITH_BOUNDS)
    .eq("page_id", pageId)
    .order("sort_order", { ascending: true });

  if (!r1.error) {
    return { data: (r1.data ?? []) as CustomFieldRow[] };
  }

  if (!isPgrstBoundsOrCacheError(r1.error)) {
    throw new Error(r1.error.message);
  }

  const r2 = await supabase
    .from("custom_fields")
    .select(CUSTOM_FIELDS_BASE)
    .eq("page_id", pageId)
    .order("sort_order", { ascending: true });

  if (r2.error) {
    throw new Error(r2.error.message);
  }

  return { data: (r2.data ?? []) as CustomFieldRow[] };
}
