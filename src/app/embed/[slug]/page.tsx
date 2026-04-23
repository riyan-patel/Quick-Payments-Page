import { notFound } from "next/navigation";
import { PaymentCheckout } from "@/components/payment/PaymentCheckout";
import { createPublicClient } from "@/lib/supabase/public";
import type { CustomFieldRow, PaymentPageRow } from "@/types/qpp";

type Props = { params: Promise<{ slug: string }> };

export default async function EmbedPayPage({ params }: Props) {
  const { slug } = await params;
  const supabase = createPublicClient();

  const { data: page, error } = await supabase
    .from("payment_pages")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !page) notFound();

  const p = page as PaymentPageRow;

  const { data: fieldsRaw } = await supabase
    .from("custom_fields")
    .select("*")
    .eq("page_id", p.id)
    .order("sort_order", { ascending: true });

  const fields = (fieldsRaw ?? []) as CustomFieldRow[];

  return (
    <main className="bg-background p-3 text-foreground" lang="en">
      <div className="mb-3 border-b border-border pb-3 text-center">
        {p.logo_url ? (
          <img
            src={p.logo_url}
            alt=""
            className="mx-auto h-10 w-auto object-contain"
            width={160}
            height={40}
          />
        ) : null}
        <h1 className="mt-2 text-lg font-bold">{p.title}</h1>
      </div>
      <PaymentCheckout page={p} fields={fields} embed />
    </main>
  );
}
