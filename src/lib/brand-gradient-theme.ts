import type { CSSProperties } from "react";

const FALLBACK_P = "#0f766e";
const FALLBACK_S = "#f59e0b";

export function validHex6(raw: string | null | undefined, fallback: string): string {
  const t = raw?.trim() ?? "";
  return /^#[0-9A-Fa-f]{6}$/i.test(t) ? t : fallback;
}

/**
 * Public pay canvas — full-bleed mesh where **primary** and **secondary** are visible
 * (tinted diagonals + soft radii; still reads as one continuous background).
 */
export function payPageBackgroundStyle(
  primary: string | null | undefined,
  secondary: string | null | undefined,
): CSSProperties {
  const p = validHex6(primary, FALLBACK_P);
  const s = validHex6(secondary, FALLBACK_S);
  return {
    background: [
      // CSS: first list item = top layer (stronger brand haze in corners)
      `radial-gradient(ellipse 100% 88% at 0% 0%, color-mix(in srgb, ${p} 40%, #faf7f2) 0%, transparent 58%)`,
      `radial-gradient(ellipse 95% 80% at 100% 0%, color-mix(in srgb, ${s} 36%, #f5f1ea) 0%, transparent 56%)`,
      `radial-gradient(ellipse 85% 65% at 18% 88%, color-mix(in srgb, ${p} 22%, color-mix(in srgb, ${s} 18%, #e6e2dc)) 0%, transparent 60%)`,
      `radial-gradient(ellipse 70% 60% at 100% 75%, color-mix(in srgb, ${s} 18%, #e0e1e3) 0%, transparent 55%)`,
      // Diagonal body: hand-off between the two tints
      `linear-gradient(168deg, color-mix(in srgb, ${p} 18%, #f1ece6) 0%, #ebe8e3 40%, color-mix(in srgb, ${s} 15%, #e6e7eb) 100%)`,
    ].join(", "),
  };
}

/** Dark pay canvas: brand tints on deep neutral (pairs with `payPageBackgroundStyle` in light). */
export function payPageBackgroundStyleDark(
  primary: string | null | undefined,
  secondary: string | null | undefined,
): CSSProperties {
  const p = validHex6(primary, FALLBACK_P);
  const s = validHex6(secondary, FALLBACK_S);
  const base = "#0b0e12";
  return {
    background: [
      `radial-gradient(ellipse 100% 88% at 0% 0%, color-mix(in srgb, ${p} 32%, ${base}) 0%, transparent 58%)`,
      `radial-gradient(ellipse 95% 80% at 100% 0%, color-mix(in srgb, ${s} 24%, ${base}) 0%, transparent 56%)`,
      `radial-gradient(ellipse 85% 65% at 18% 88%, color-mix(in srgb, ${p} 20%, color-mix(in srgb, ${s} 14%, #12161c)) 0%, transparent 60%)`,
      `radial-gradient(ellipse 70% 60% at 100% 75%, color-mix(in srgb, ${s} 12%, #141820) 0%, transparent 55%)`,
      `linear-gradient(168deg, #0a0c10 0%, #0d1016 40%, #0b0d12 100%)`,
    ].join(", "),
  };
}

/**
 * Glass panel border color (elevation is `pay-glass-surface` in globals for light / dark).
 */
export function brandGlassPanelBorder(primary: string | null | undefined): CSSProperties {
  const p = validHex6(primary, FALLBACK_P);
  return {
    borderColor: `color-mix(in srgb, ${p} 18%, var(--border))`,
  };
}

export function payShellCssVars(
  primary: string | null | undefined,
  secondary: string | null | undefined,
): CSSProperties {
  const p = validHex6(primary, FALLBACK_P);
  const s = validHex6(secondary, FALLBACK_S);
  return {
    ["--qpp-pri" as string]: p,
    ["--qpp-sec" as string]: s,
  };
}
