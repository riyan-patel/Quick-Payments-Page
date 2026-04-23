import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DistributionPanel } from "@/components/admin/DistributionPanel";
import { PageEditorForm } from "@/components/admin/PageEditorForm";
import { getCustomFieldsForPage } from "@/lib/custom-fields-for-page";
import { createClient } from "@/lib/supabase/server";
import type { CustomFieldRow, PaymentPageRow } from "@/types/qpp";

type Props = {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EditPaymentPage({ params, searchParams }: Props) {
  const { id, locale } = await params;
  const sp = await searchParams;
  const savedParam = sp.saved;
  const showSaveSuccess =
    savedParam === "1" || (Array.isArray(savedParam) && savedParam[0] === "1");
  setRequestLocale(locale);
  const t = await getTranslations("adminEdit");

  const supabase = await createClient();

  const { data: page, error } = await supabase
    .from("payment_pages")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !page) notFound();

  const p = page as PaymentPageRow;
  let fields: CustomFieldRow[];
  try {
    const r = await getCustomFieldsForPage(supabase, id);
    fields = r.data;
  } catch {
    notFound();
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {t("editTitle", { title: p.title })}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t("slugLine", { slug: p.slug })}
        </p>
      </div>

      <DistributionPanel slug={p.slug} title={p.title} appUrl={appUrl} />

      <div>
        <h2 className="app-heading mb-4 text-xl font-semibold text-foreground">
          {t("configHeading")}
        </h2>
        <PageEditorForm initialPage={p} initialFields={fields} showSaveSuccess={showSaveSuccess} />
      </div>
    </div>
  );
}
