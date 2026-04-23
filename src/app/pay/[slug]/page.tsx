import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Sparkles } from "lucide-react";
import { PayTrustPills } from "@/components/pay/PayTrustPills";
import { PaymentCheckout } from "@/components/payment/PaymentCheckout";
import { Card, CardContent } from "@/components/ui/card";
import { PAYMENT_PAGE_PUBLIC_SELECT } from "@/lib/payment-page-public-select";
import { createPublicClient } from "@/lib/supabase/public";
import type { CustomFieldRow, PublicPaymentPageRow } from "@/types/qpp";
import { getBrandPair } from "@/lib/brand-color-pair";
import {
  brandGlowOrbs,
  brandHostPanelStyle,
  brandStripGradientStyle,
  payPageBackgroundStyle,
  payShellCssVars,
} from "@/lib/brand-gradient-theme";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("payment_pages")
    .select("title, subtitle")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return { title: "Payment page" };
  const p = data as Pick<PublicPaymentPageRow, "title" | "subtitle">;
  return {
    title: `${p.title} — Pay`,
    description: p.subtitle ?? "Secure payment",
  };
}

export default async function PublicPayPage({ params }: Props) {
  const { slug } = await params;
  const supabase = createPublicClient();

  const { data: page, error } = await supabase
    .from("payment_pages")
    .select(PAYMENT_PAGE_PUBLIC_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error || !page) notFound();

  const p = page as unknown as PublicPaymentPageRow;

  const { data: fieldsRaw } = await supabase
    .from("custom_fields")
    .select("*")
    .eq("page_id", p.id)
    .order("sort_order", { ascending: true });

  const fields = (fieldsRaw ?? []) as CustomFieldRow[];

  const showBrandingColumn = Boolean(p.logo_url || p.trust_panel);
  const { primary: brandPrimary, secondary: brandSecondary } = getBrandPair(p);
  const hostGlow = brandGlowOrbs(brandPrimary, brandSecondary);

  return (
    <main
      id="pay-main"
      style={{
        ...payPageBackgroundStyle(brandPrimary, brandSecondary),
        ...payShellCssVars(brandPrimary, brandSecondary),
      }}
      className={cn(
        "relative mx-auto min-h-0 px-4 py-10 sm:py-14 lg:py-20",
        showBrandingColumn ? "max-w-6xl" : "max-w-xl",
      )}
      lang="en"
    >
      <div
        className={cn(
          showBrandingColumn &&
            "lg:grid lg:min-h-0 lg:grid-cols-[minmax(0,min(100%,400px))_minmax(0,1fr)] lg:items-stretch lg:gap-6 xl:gap-10 2xl:gap-12",
        )}
      >
        {showBrandingColumn ? (
          <aside
            aria-label="Organization and trust information"
            className="mb-8 flex h-full min-h-0 min-w-0 flex-col lg:mb-0"
          >
            <div
              className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[1.75rem] border border-white/10 p-7 text-zinc-100 sm:p-8"
              style={brandHostPanelStyle(brandPrimary, brandSecondary)}
            >
              <div
                className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full blur-3xl"
                style={hostGlow.top}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full blur-3xl"
                style={hostGlow.bottom}
                aria-hidden
              />
              <p
                className="relative mb-1 flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.22em]"
                style={{ color: `color-mix(in srgb, ${brandSecondary} 82%, #fff)` }}
              >
                <Sparkles
                  className="size-3.5"
                  style={{ color: `color-mix(in srgb, ${brandSecondary} 90%, #fff)` }}
                  strokeWidth={1.5}
                  aria-hidden
                />
                Your host
              </p>
              {p.logo_url ? (
                <div className="relative mt-3 flex justify-center lg:justify-start">
                  <div className="flex w-full max-w-full items-center justify-center rounded-2xl border border-white/15 bg-white p-5 shadow-lg sm:p-7">
                    <img
                      src={p.logo_url}
                      alt={`${p.title} logo`}
                      className="h-auto w-auto max-h-32 max-w-full object-contain sm:max-h-40 lg:max-h-52"
                      sizes="(max-width: 1024px) 100vw, 400px"
                    />
                  </div>
                </div>
              ) : null}

              <div className="relative mt-6 space-y-1 border-t border-white/10 pt-6">
                <h2 className="pay-font-display text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  {p.title}
                </h2>
                {p.subtitle ? (
                  <p className="text-sm leading-relaxed text-zinc-400">{p.subtitle}</p>
                ) : null}
              </div>

              {p.trust_panel ? (
                <Card
                  aria-label="Trust and transparency"
                  className={cn(
                    "relative mt-6 border-white/10 bg-white/[0.05] text-sm text-zinc-300 shadow-none backdrop-blur-sm",
                  )}
                >
                  <CardContent className="space-y-3 sm:px-5">
                    <h3
                      className="text-xs font-semibold uppercase tracking-[0.15em]"
                      style={{ color: `color-mix(in srgb, ${brandSecondary} 78%, #fff)` }}
                    >
                      Why you can trust this page
                    </h3>
                    <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-zinc-200">
                      {p.trust_panel}
                    </p>
                    <ul className="space-y-2 text-sm leading-relaxed text-zinc-400">
                      <li className="flex gap-2">
                        <span
                          className="mt-1.5 size-1.5 shrink-0 rounded-full"
                          style={{ background: `color-mix(in srgb, ${brandSecondary} 75%, #444)` }}
                        />
                        Payments are processed securely by Stripe (test mode in demos).
                      </li>
                      <li className="flex gap-2">
                        <span
                          className="mt-1.5 size-1.5 shrink-0 rounded-full"
                          style={{ background: `color-mix(in srgb, ${brandSecondary} 75%, #444)` }}
                        />
                        Your card details are never stored on our servers.
                      </li>
                      <li className="flex gap-2">
                        <span
                          className="mt-1.5 size-1.5 shrink-0 rounded-full"
                          style={{ background: `color-mix(in srgb, ${brandSecondary} 75%, #444)` }}
                        />
                        You will receive a confirmation email after a successful payment.
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </aside>
        ) : null}

        <div
          className={cn("flex min-w-0 min-h-0 flex-col", showBrandingColumn && "h-full lg:min-h-0")}
        >
          <div
            className={cn(
              "relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.9rem] border border-foreground/8",
              "bg-[color:var(--qpp-glass)] shadow-[0_1px_0_rgba(255,255,255,0.85)_inset,0_2px_0_rgba(0,0,0,0.02)_inset,0_40px_100px_-30px_rgba(0,0,0,0.18),0_12px_32px_-12px_rgba(0,0,0,0.1)]",
              "backdrop-blur-2xl backdrop-saturate-150",
              showBrandingColumn && "min-h-full",
            )}
          >
            <div
              className="h-1.5 w-full shrink-0"
              style={brandStripGradientStyle(brandPrimary, brandSecondary)}
              role="presentation"
            />
            <div className="flex min-h-0 flex-1 flex-col p-6 sm:p-8 lg:p-9">
              <div className="mb-6 shrink-0">
                <PayTrustPills />
              </div>
              <header className={cn("shrink-0 text-center", showBrandingColumn && "lg:text-left")}>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Secure checkout
                </p>
                <h1 className="pay-font-display mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl sm:leading-[1.1]">
                  {showBrandingColumn ? "Complete your payment" : p.title}
                </h1>
                {!showBrandingColumn && p.subtitle ? (
                  <p className="mt-2 text-base text-muted-foreground sm:text-lg sm:leading-relaxed">
                    {p.subtitle}
                  </p>
                ) : null}
                {showBrandingColumn ? (
                  <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                    Review the amount and your details, then pay securely in one step.
                  </p>
                ) : null}
                {p.header_message ? (
                  <div
                    className="mt-5 rounded-2xl border px-4 py-3 text-left text-sm leading-relaxed"
                    style={{
                      borderColor: `color-mix(in srgb, ${brandSecondary} 32%, #fde68a)`,
                      background: `color-mix(in srgb, ${brandSecondary} 9%, #fffbeb)`,
                      color: "rgb(40 28 10 / 0.92)",
                    }}
                  >
                    {p.header_message}
                  </div>
                ) : null}
              </header>

              <div className="mt-7 min-h-0 flex-1 sm:mt-9">
                <PaymentCheckout page={p} fields={fields} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
