import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { BrandAccentBar } from "@/components/pay/BrandAccentBar";
import { PayPageBrandBackdrop } from "@/components/pay/PayPageBrandBackdrop";
import { PayTrustPills } from "@/components/pay/PayTrustPills";
import { PaymentCheckout } from "@/components/payment/PaymentCheckout";
import { createPublicClient } from "@/lib/supabase/public";
import { getBrandPair } from "@/lib/brand-color-pair";
import { brandGlassPanelBorder, payShellCssVars } from "@/lib/brand-gradient-theme";
import type { CustomFieldRow, PaymentPageRow } from "@/types/qpp";

type Props = { params: Promise<{ slug: string; locale: string }> };

export default async function EmbedPayPage({ params }: Props) {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const supabase = createPublicClient();

  const { data: page, error } = await supabase
    .from("payment_pages")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !page) notFound();

  const p = page as PaymentPageRow;
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
      style={payShellCssVars(brandPrimary, brandSecondary)}
      className="relative min-h-full w-full p-2.5 text-foreground sm:p-3.5"
      lang={locale}
    >
      <PayPageBrandBackdrop brandPrimary={brandPrimary} brandSecondary={brandSecondary} />
      <div
        className="pay-glass-surface mx-auto max-w-md overflow-hidden rounded-2xl border border-solid bg-[color:var(--qpp-glass)] text-card-foreground backdrop-blur-2xl backdrop-saturate-150"
        style={brandGlassPanelBorder(brandPrimary)}
      >
        <BrandAccentBar primary={brandPrimary} secondary={brandSecondary} />
        <div className="p-3.5 pt-3 sm:p-4 sm:pt-3.5">
          <div className="mb-3 flex justify-center">
            <PayTrustPills />
          </div>
          <div className="border-b border-border/60 pb-3.5 text-center">
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
