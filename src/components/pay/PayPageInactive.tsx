import { getTranslations } from "next-intl/server";
import { Ban } from "lucide-react";
import { PayPageBrandBackdrop } from "@/components/pay/PayPageBrandBackdrop";
import { Card, CardContent } from "@/components/ui/card";
import { getBrandPair } from "@/lib/brand-color-pair";
import { brandGlassPanelBorder, payShellCssVars } from "@/lib/brand-gradient-theme";
import { cn } from "@/lib/utils";

type InactivePageProps = {
  locale: string;
  title: string;
  subtitle: string | null;
  brand_color: string;
  brand_color_secondary?: string | null;
  logo_url: string | null;
  /** When true, tighter padding for embed */
  embed?: boolean;
};

export async function PayPageInactive({
  locale,
  title,
  subtitle,
  brand_color,
  brand_color_secondary,
  logo_url,
  embed,
}: InactivePageProps) {
  const t = await getTranslations("pay");
  const { primary: brandPrimary, secondary: brandSecondary } = getBrandPair({
    brand_color,
    brand_color_secondary,
  });

  return (
    <main
      id="pay-main"
      data-qpp="pay-inactive"
      style={payShellCssVars(brandPrimary, brandSecondary)}
      className={cn(
        "relative w-full min-h-0 text-foreground",
        embed ? "min-h-full p-2.5 sm:p-3.5" : "min-h-[60vh] px-4 py-12 sm:py-16",
      )}
      lang={locale}
    >
      <PayPageBrandBackdrop brandPrimary={brandPrimary} brandSecondary={brandSecondary} />
      <div
        className={cn(
          "relative mx-auto max-w-lg",
          embed ? "max-w-md" : "",
        )}
      >
        <div
          className="pay-glass-surface overflow-hidden rounded-2xl border border-solid bg-[color:var(--qpp-glass)] text-card-foreground backdrop-blur-2xl backdrop-saturate-150"
          style={brandGlassPanelBorder(brandPrimary)}
        >
          <div
            className="h-1 w-full"
            style={{
              background: `linear-gradient(90deg, ${brandPrimary}, ${brandSecondary})`,
            }}
            aria-hidden
          />
          <Card className="border-0 bg-transparent shadow-none">
            <CardContent className={cn("space-y-4", embed ? "p-4 sm:p-5" : "p-6 sm:p-8")}>
              {logo_url ? (
                <div className="flex justify-center">
                  <img
                    src={logo_url}
                    alt=""
                    className="h-10 w-auto max-w-full object-contain sm:h-12"
                    width={200}
                    height={48}
                  />
                </div>
              ) : null}
              <div className="flex flex-col items-center gap-2 text-center">
                <div
                  className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 text-foreground/80"
                  aria-hidden
                >
                  <Ban className="size-6" strokeWidth={1.5} />
                </div>
                <h1 className="pay-font-display text-xl font-semibold tracking-tight sm:text-2xl">
                  {t("inactiveTitle")}
                </h1>
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {t("inactiveBody")}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("inactivePageLabel")}
                </p>
                <p className="mt-1 font-medium text-foreground">{title}</p>
                {subtitle ? (
                  <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
