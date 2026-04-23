import type { CSSProperties } from "react";
import { validHex6 } from "@/lib/brand-gradient-theme";

const FALLBACK_P = "#0f766e";

function readableTextOn(hex: string): "#fafafa" | "#18181b" {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "#fafafa";
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const l = 0.2126 * (r <= 0.03928 ? r / 12.92 : ((r + 0.055) / 1.055) ** 2.4) +
    0.7152 * (g <= 0.03928 ? g / 12.92 : ((g + 0.055) / 1.055) ** 2.4) +
    0.0722 * (b <= 0.03928 ? b / 12.92 : ((b + 0.055) / 1.055) ** 2.4);
  return l > 0.55 ? "#18181b" : "#fafafa";
}

/**
 * Flat CTA: solid primary fill, no gradients or glossy insets. Matches the rest of the app
 * (shadcn-style buttons) while honoring the org’s pick.
 */
export function brandCtaStyle(
  primary: string | null | undefined,
  _secondary?: string | null | undefined,
): CSSProperties {
  const bg = validHex6(primary, FALLBACK_P);
  return {
    backgroundColor: bg,
    color: readableTextOn(bg),
  };
}

export const ctaButtonClassName =
  "h-12 w-full rounded-lg border-0 text-base font-semibold shadow-sm transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.99] active:opacity-100 disabled:opacity-50 disabled:active:scale-100";
