import { notFound } from "next/navigation";
import { DistributionPanel } from "@/components/admin/DistributionPanel";
import { PageEditorForm } from "@/components/admin/PageEditorForm";
import { createClient } from "@/lib/supabase/server";
import type { CustomFieldRow, PaymentPageRow } from "@/types/qpp";

type Props = { params: Promise<{ id: string }> };

export default async function EditPaymentPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: page, error } = await supabase
    .from("payment_pages")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !page) notFound();

  const { data: fieldsRaw } = await supabase
    .from("custom_fields")
    .select("*")
    .eq("page_id", id)
    .order("sort_order", { ascending: true });

  const p = page as PaymentPageRow;
  const fields = (fieldsRaw ?? []) as CustomFieldRow[];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Edit: {p.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Slug{" "}
          <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-foreground">{p.slug}</code>{" "}
          — inactive pages are hidden from the public but stay editable here.
        </p>
      </div>

      <DistributionPanel slug={p.slug} title={p.title} appUrl={appUrl} />

      <div>
        <h2 className="app-heading mb-4 text-xl font-semibold text-foreground">Configuration</h2>
        <PageEditorForm initialPage={p} initialFields={fields} />
      </div>
    </div>
  );
}
