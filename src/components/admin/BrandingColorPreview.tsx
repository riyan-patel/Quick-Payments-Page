"use client";

import { BrandAccentBar } from "@/components/pay/BrandAccentBar";
import { brandCtaStyle } from "@/lib/brand-cta-style";
import { brandGlassPanelBorder, payPageBackgroundStyle, payShellCssVars } from "@/lib/brand-gradient-theme";
import { cn } from "@/lib/utils";

/** Miniature of public pay: brand mesh + glass host and checkout (split bar, solid CTA). */
export function BrandingColorPreview({ primary, secondary }: { primary: string; secondary: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
      <p className="px-3 pt-2.5 text-[0.65rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        Public page preview
      </p>
      <div
        className="p-3 pt-2 sm:p-3.5"
        data-qpp="pay"
        style={{ ...payPageBackgroundStyle(primary, secondary), ...payShellCssVars(primary, secondary) }}
      >
        <div className="grid gap-2.5 sm:grid-cols-[1fr_1.15fr] sm:items-stretch sm:gap-2">
          <div
            className="pay-glass-surface relative min-h-[5.5rem] overflow-hidden rounded-2xl border border-solid bg-[color:var(--qpp-glass)] p-2.5 text-[0.7rem] text-foreground backdrop-blur-xl backdrop-saturate-150"
            style={brandGlassPanelBorder(primary)}
          >
            <p className="text-[0.5rem] font-semibold uppercase tracking-widest text-muted-foreground">Host</p>
            <p className="mt-0.5 font-medium text-foreground/90">Page title</p>
          </div>
          <div
            className="pay-glass-surface flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-solid bg-[color:var(--qpp-glass)] text-card-foreground backdrop-blur-xl backdrop-saturate-150"
            style={brandGlassPanelBorder(primary)}
          >
            <BrandAccentBar primary={primary} secondary={secondary} />
            <div className="space-y-1.5 p-2.5">
              <p className="text-[0.5rem] font-semibold uppercase tracking-widest text-muted-foreground">
                Checkout
              </p>
              <div
                className="h-6 rounded-md shadow-sm"
                style={brandCtaStyle(primary)}
                aria-hidden
              />
            </div>
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2 sm:mt-3">
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2 py-1 text-[0.65rem] text-muted-foreground",
            )}
          >
            <span
              className="size-2.5 shrink-0 rounded-sm ring-1 ring-border"
              style={{ backgroundColor: primary }}
              aria-hidden
            />
            Primary — buttons & key accents
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2 py-1 text-[0.65rem] text-muted-foreground">
            <span
              className="size-2.5 shrink-0 rounded-sm ring-1 ring-border"
              style={{ backgroundColor: secondary }}
              aria-hidden
            />
            Accent — bar, labels, highlights
          </div>
        </div>
      </div>
    </div>
  );
}
