import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Sparkles } from "lucide-react";
import { BrandAccentBar } from "@/components/pay/BrandAccentBar";
import { PayPageBrandBackdrop } from "@/components/pay/PayPageBrandBackdrop";
import { PayTrustPills } from "@/components/pay/PayTrustPills";
import { PaymentCheckout } from "@/components/payment/PaymentCheckout";
import { Card, CardContent } from "@/components/ui/card";
import { createPublicClient } from "@/lib/supabase/public";
import type { CustomFieldRow, PaymentPageRow } from "@/types/qpp";
import { getBrandPair } from "@/lib/brand-color-pair";
import { brandGlassPanelBorder, payShellCssVars } from "@/lib/brand-gradient-theme";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ slug: string; locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pay");
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("payment_pages")
    .select("title, subtitle")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) {
    return { title: t("metadataTitle") };
  }
  const p = data as Pick<PaymentPageRow, "title" | "subtitle">;
  return {
    title: `${p.title} — ${t("metadataPaySuffix")}`,
    description: p.subtitle ?? t("metadataDescription"),
  };
}

export default async function PublicPayPage({ params }: Props) {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pay");
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

  const showBrandingColumn = Boolean(p.logo_url || p.trust_panel);
  const { primary: brandPrimary, secondary: brandSecondary } = getBrandPair(p);

  return (
    <main
      id="pay-main"
      data-qpp="pay"
      style={payShellCssVars(brandPrimary, brandSecondary)}
      className="relative w-full min-h-0"
      lang={locale}
    >
      <PayPageBrandBackdrop brandPrimary={brandPrimary} brandSecondary={brandSecondary} />
      <div
        className={cn(
          "relative mx-auto min-h-0 px-4 py-10 sm:py-14 lg:py-20",
          showBrandingColumn ? "max-w-6xl" : "max-w-xl",
        )}
      >
        <div
          className={cn(
            showBrandingColumn &&
              "lg:grid lg:min-h-0 lg:grid-cols-[minmax(0,min(100%,400px))_minmax(0,1fr)] lg:items-start lg:gap-6 xl:gap-8 2xl:gap-10",
          )}
        >
        {showBrandingColumn ? (
          <aside
            aria-label={t("asideAria")}
            className="mb-8 flex min-h-0 min-w-0 flex-col self-stretch lg:mb-0"
          >
            <div
              className="pay-glass-surface relative flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden rounded-2xl border border-solid bg-[color:var(--qpp-glass)] p-7 text-foreground backdrop-blur-2xl backdrop-saturate-150 sm:p-8"
              style={brandGlassPanelBorder(brandPrimary)}
            >
              <p
                className="mb-1 flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground"
                style={{ color: brandSecondary }}
              >
                <Sparkles className="size-3.5" style={{ color: brandSecondary }} strokeWidth={1.5} aria-hidden />
                {t("hostLabel")}
              </p>
              {p.logo_url ? (
                <div className="relative mt-3 flex justify-center lg:justify-start">
                  <div className="flex w-full max-w-full items-center justify-center rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm sm:p-7">
                    <img
                      src={p.logo_url}
                      alt={`${p.title} logo`}
                      className="h-auto w-auto max-h-32 max-w-full object-contain sm:max-h-40 lg:max-h-52"
                      sizes="(max-width: 1024px) 100vw, 400px"
                    />
                  </div>
                </div>
              ) : null}

              <div className="relative mt-6 space-y-1 border-t border-border/60 pt-6">
                <h2 className="pay-font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  {p.title}
                </h2>
                {p.subtitle ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">{p.subtitle}</p>
                ) : null}
              </div>

              {p.trust_panel ? (
                <Card
                  aria-label={t("trustTitle")}
                  className="relative mt-6 border border-border/80 border-l-[3px] bg-muted/30 text-sm text-foreground/90 shadow-sm"
                  style={{ borderLeftColor: brandPrimary }}
                >
                  <CardContent className="space-y-3 sm:px-5">
                    <h3
                      className="text-xs font-semibold uppercase tracking-[0.15em]"
                      style={{ color: brandPrimary }}
                    >
                      {t("trustTitle")}
                    </h3>
                    <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-foreground/85">
                      {p.trust_panel}
                    </p>
                    <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                      <li className="flex gap-2">
                        <span
                          className="mt-1.5 size-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: brandSecondary }}
                        />
                        {t("trustList1")}
                      </li>
                      <li className="flex gap-2">
                        <span
                          className="mt-1.5 size-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: brandSecondary }}
                        />
                        {t("trustList2")}
                      </li>
                      <li className="flex gap-2">
                        <span
                          className="mt-1.5 size-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: brandSecondary }}
                        />
                        {t("trustList3")}
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </aside>
        ) : null}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col self-stretch">
          <div
            className="pay-glass-surface relative flex w-full min-w-0 flex-1 flex-col overflow-x-hidden rounded-2xl border border-solid bg-[color:var(--qpp-glass)] text-card-foreground backdrop-blur-2xl backdrop-saturate-150"
            style={brandGlassPanelBorder(brandPrimary)}
          >
            <BrandAccentBar primary={brandPrimary} secondary={brandSecondary} />
            <div className="flex flex-col p-6 sm:p-8 lg:p-9">
              <div className="mb-6 shrink-0">
                <PayTrustPills />
              </div>
              <header className={cn("shrink-0 text-center", showBrandingColumn && "lg:text-left")}>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  {t("secureCheckout")}
                </p>
                <h1 className="pay-font-display mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl sm:leading-[1.1]">
                  {showBrandingColumn ? t("completePayment") : p.title}
                </h1>
                {!showBrandingColumn && p.subtitle ? (
                  <p className="mt-2 text-base text-muted-foreground sm:text-lg sm:leading-relaxed">
                    {p.subtitle}
                  </p>
                ) : null}
                {showBrandingColumn ? (
                  <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                    {t("reviewLine")}
                  </p>
                ) : null}
                {p.header_message ? (
                  <div
                    className="mt-5 rounded-2xl border border-amber-200/50 bg-amber-50/70 px-4 py-3 text-left text-sm leading-relaxed text-amber-950/90 dark:border-amber-500/25 dark:bg-amber-950/30 dark:text-amber-100/90"
                    style={{
                      boxShadow: `inset 3px 0 0 0 ${brandPrimary}`,
                    }}
                  >
                    {p.header_message}
                  </div>
                ) : null}
              </header>

              <div className="mt-7 sm:mt-9">
                <PaymentCheckout page={p} fields={fields} />
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </main>
  );
}
