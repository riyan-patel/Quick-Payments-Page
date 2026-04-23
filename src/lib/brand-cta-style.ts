import type { CSSProperties } from "react";
import { validHex6 } from "@/lib/brand-gradient-theme";

const FALLBACK_P = "#0f766e";
const FALLBACK_S = "#f59e0b";

/**
 * Two-tone pill CTA: primary → secondary (with highlight) + tinted shadow.
 */
export function brandCtaStyle(
  primary: string | null | undefined,
  secondary?: string | null | undefined,
): CSSProperties {
  const p = validHex6(primary, FALLBACK_P);
  const s = validHex6(secondary, FALLBACK_S);
  return {
    background: `linear-gradient(180deg, color-mix(in srgb, ${p} 70%, #ffffff) 0%, ${p} 42%, color-mix(in srgb, ${p} 40%, ${s}) 100%)`,
    boxShadow: [
      "inset 0 1px 0 rgba(255,255,255,0.3)",
      `0 12px 32px -10px color-mix(in srgb, ${p} 45%, rgba(0,0,0,0.2))`,
      `0 4px 16px -6px color-mix(in srgb, ${s} 35%, rgba(0,0,0,0.12))`,
      "0 1px 2px rgba(0,0,0,0.05)",
    ].join(", "),
  };
}

export const ctaButtonClassName =
  "h-12 w-full rounded-full border-0 text-base font-semibold text-white transition-[transform,filter,box-shadow] duration-200 hover:brightness-105 active:scale-[0.99] active:brightness-95 disabled:opacity-60 disabled:active:scale-100";
