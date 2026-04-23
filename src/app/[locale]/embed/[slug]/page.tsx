import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { BrandAccentBar } from "@/components/pay/BrandAccentBar";
import { PayPageInactive } from "@/components/pay/PayPageInactive";
import { PayPageBrandBackdrop } from "@/components/pay/PayPageBrandBackdrop";
import { PayTrustPills } from "@/components/pay/PayTrustPills";
import { PaymentCheckout } from "@/components/payment/PaymentCheckout";
import { getCustomFieldsForPage } from "@/lib/custom-fields-for-page";
import { loadPublicPaymentPage } from "@/lib/load-public-payment-page";
import { createPublicClient } from "@/lib/supabase/public";
import { getBrandPair } from "@/lib/brand-color-pair";
import { brandGlassPanelBorder, payShellCssVars } from "@/lib/brand-gradient-theme";
import type { CustomFieldRow } from "@/types/qpp";

type Props = { params: Promise<{ slug: string; locale: string }> };

export default async function EmbedPayPage({ params }: Props) {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const loaded = await loadPublicPaymentPage(slug);
  if (loaded.kind === "missing" || loaded.kind === "error") notFound();
  if (loaded.kind === "inactive") {
    const r = loaded.page;
    return (
      <PayPageInactive
        locale={locale}
        title={r.title}
        subtitle={r.subtitle}
        brand_color={r.brand_color}
        brand_color_secondary={r.brand_color_secondary}
        logo_url={r.logo_url}
        embed
      />
    );
  }

  const p = loaded.page;
  const supabase = createPublicClient();
  const { primary: brandPrimary, secondary: brandSecondary } = getBrandPair(p);

  let fields: CustomFieldRow[];
  try {
    const r = await getCustomFieldsForPage(supabase, p.id);
    fields = r.data;
  } catch {
    notFound();
  }

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
              <div className="mx-auto flex h-10 w-full max-w-[12rem] min-w-0 items-center justify-center sm:h-12">
                <img
                  src={p.logo_url}
                  alt=""
                  className="h-full w-full min-h-0 min-w-0 object-contain object-center"
                  width={192}
                  height={48}
                />
              </div>
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
