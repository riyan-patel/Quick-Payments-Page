"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Enable/disable from the admin list. Isolated module so the Server Action id is stable
 * under Turbopack (avoids UnrecognizedActionError when bound from locale routes).
 */
export async function togglePaymentPageActive(formData: FormData): Promise<void> {
  const pageId = formData.get("pageId");
  if (typeof pageId !== "string" || !pageId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: row, error: qErr } = await supabase
    .from("payment_pages")
    .select("id, is_active, created_by, slug")
    .eq("id", pageId)
    .single();

  if (qErr || !row || row.created_by !== user.id) return;

  const { error: uErr } = await supabase
    .from("payment_pages")
    .update({ is_active: !row.is_active })
    .eq("id", pageId);
  if (uErr) return;

  revalidatePath("/admin/pages");
  revalidatePath("/es/admin/pages");
  revalidatePath(`/admin/pages/${pageId}/edit`);
  revalidatePath(`/es/admin/pages/${pageId}/edit`);
  revalidatePath(`/pay/${row.slug}`);
  revalidatePath(`/es/pay/${row.slug}`);
  revalidatePath(`/embed/${row.slug}`);
  revalidatePath(`/es/embed/${row.slug}`);
}
