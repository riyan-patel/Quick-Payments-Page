import { notFound } from "next/navigation";
import { PayTrustPills } from "@/components/pay/PayTrustPills";
import { PaymentCheckout } from "@/components/payment/PaymentCheckout";
import { PAYMENT_PAGE_PUBLIC_SELECT } from "@/lib/payment-page-public-select";
import { createPublicClient } from "@/lib/supabase/public";
import { getBrandPair } from "@/lib/brand-color-pair";
import { brandStripGradientStyle, payPageBackgroundStyle, payShellCssVars } from "@/lib/brand-gradient-theme";
import type { CustomFieldRow, PublicPaymentPageRow } from "@/types/qpp";

type Props = { params: Promise<{ slug: string }> };

export default async function EmbedPayPage({ params }: Props) {
  const { slug } = await params;
  const supabase = createPublicClient();

  const { data: page, error } = await supabase
    .from("payment_pages")
    .select(PAYMENT_PAGE_PUBLIC_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error || !page) notFound();

  const p = page as unknown as PublicPaymentPageRow;
  const { primary: brandPrimary, secondary: brandSecondary } = getBrandPair(p);

  const { data: fieldsRaw } = await supabase
    .from("custom_fields")
    .select("*")
    .eq("page_id", p.id)
    .order("sort_order", { ascending: true });

  const fields = (fieldsRaw ?? []) as CustomFieldRow[];

  return (
    <main
      data-qpp="pay"
      style={{
        ...payPageBackgroundStyle(brandPrimary, brandSecondary),
        ...payShellCssVars(brandPrimary, brandSecondary),
      }}
      className="min-h-full p-2.5 text-foreground sm:p-3.5"
      lang="en"
    >
      <div
        className="overflow-hidden rounded-2xl border border-foreground/8 bg-card/90 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.12),0_1px_0_rgba(255,255,255,0.6)_inset] backdrop-blur-md"
      >
        <div
          className="h-0.5 w-full"
          style={brandStripGradientStyle(brandPrimary, brandSecondary)}
          aria-hidden
        />
        <div className="p-3.5 sm:p-4">
          <div className="mb-3 flex justify-center">
            <PayTrustPills />
          </div>
          <div className="border-b border-foreground/6 pb-3.5 text-center">
            {p.logo_url ? (
              <img
                src={p.logo_url}
                alt=""
                className="mx-auto h-9 w-auto object-contain sm:h-11"
                width={160}
                height={40}
              />
            ) : null}
            <h1 className="pay-font-display mt-1.5 text-base font-bold tracking-tight sm:text-lg">
              {p.title}
            </h1>
          </div>
          <div className="pt-3.5">
            <PaymentCheckout page={p} fields={fields} embed />
          </div>
        </div>
      </div>
    </main>
  );
}
