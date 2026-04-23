import type { CSSProperties } from "react";

const FALLBACK_P = "#0f766e";
const FALLBACK_S = "#f59e0b";

export function validHex6(raw: string | null | undefined, fallback: string): string {
  const t = raw?.trim() ?? "";
  return /^#[0-9A-Fa-f]{6}$/i.test(t) ? t : fallback;
}

/** Soft page background (light mesh from primary + secondary). */
export function payPageBackgroundStyle(
  primary: string | null | undefined,
  secondary: string | null | undefined,
): CSSProperties {
  const p = validHex6(primary, FALLBACK_P);
  const s = validHex6(secondary, FALLBACK_S);
  return {
    background: [
      `radial-gradient(90% 60% at 10% 0%, color-mix(in srgb, ${p} 16%, #faf8f2) 0%, transparent 55%)`,
      `radial-gradient(80% 50% at 90% 10%, color-mix(in srgb, ${s} 14%, #f0f2f6) 0%, transparent 50%)`,
      `linear-gradient(180deg, #faf7f0 0%, #f3f0ea 50%, #eef1f4 100%)`,
    ].join(", "),
  };
}

/** Dark host column: neutral base + brand-tinted gradient. */
export function brandHostPanelStyle(
  primary: string | null | undefined,
  secondary: string | null | undefined,
): CSSProperties {
  const p = validHex6(primary, FALLBACK_P);
  const s = validHex6(secondary, FALLBACK_S);
  return {
    background: `linear-gradient(165deg, #141416 0%, color-mix(in srgb, ${p} 32%, #0c0c0e) 42%, #09090a 100%)`,
    boxShadow: [
      "inset 0 1px 0 rgba(255,255,255,0.07)",
      "0 32px 64px -24px rgba(0,0,0,0.55)",
      `0 0 0 1px color-mix(in srgb, ${p} 25%, rgba(0,0,0,0.35))`,
    ].join(", "),
  };
}

export function brandGlowOrbs(
  primary: string | null | undefined,
  secondary: string | null | undefined,
): { top: CSSProperties; bottom: CSSProperties } {
  const p = validHex6(primary, FALLBACK_P);
  const s = validHex6(secondary, FALLBACK_S);
  return {
    top: { background: `color-mix(in srgb, ${s} 22%, transparent)` },
    bottom: { background: `color-mix(in srgb, ${p} 20%, transparent)` },
  };
}

/** Horizontal brand strip (checkout card top, amount accent). */
export function brandStripGradientStyle(
  primary: string | null | undefined,
  secondary: string | null | undefined,
): CSSProperties {
  const p = validHex6(primary, FALLBACK_P);
  const s = validHex6(secondary, FALLBACK_S);
  return {
    background: `linear-gradient(90deg, color-mix(in srgb, ${p} 90%, #fff) 0%, ${p} 35%, color-mix(in srgb, ${s} 85%, #fff) 100%)`,
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
