import { validHex6 } from "@/lib/brand-gradient-theme";

const DEFAULT_PRIMARY = "#0f766e";
const DEFAULT_SECONDARY = "#f59e0b";

/**
 * We store both in the existing `payment_pages.brand_color` text column as
 * `#rrggbb|#rrggbb` so a second DB column is optional. Legacy rows use a single
 * `#rrggbb` plus an optional `brand_color_secondary` column if present.
 */
export function formatBrandColorStorage(primary: string, secondary: string): string {
  const p = validHex6(primary, DEFAULT_PRIMARY).toLowerCase();
  const s = validHex6(secondary, DEFAULT_SECONDARY).toLowerCase();
  return `${p}|${s}`;
}

export function parseBrandColorStorage(
  brandColor: string | null | undefined,
  brandColorSecondaryColumn: string | null | undefined,
): { primary: string; secondary: string } {
  const raw = (brandColor ?? "").trim();
  if (raw.includes("|")) {
    const [a, b] = raw.split("|", 2).map((s) => s.trim());
    return {
      primary: validHex6(a, DEFAULT_PRIMARY).toLowerCase(),
      secondary: validHex6(b, DEFAULT_SECONDARY).toLowerCase(),
    };
  }
  if (/^#[0-9A-Fa-f]{6}$/i.test(raw)) {
    return {
      primary: validHex6(raw, DEFAULT_PRIMARY).toLowerCase(),
      secondary: validHex6(brandColorSecondaryColumn, DEFAULT_SECONDARY).toLowerCase(),
    };
  }
  return {
    primary: DEFAULT_PRIMARY,
    secondary: validHex6(brandColorSecondaryColumn, DEFAULT_SECONDARY).toLowerCase(),
  };
}

export function getBrandPair(page: {
  brand_color: string;
  brand_color_secondary?: string | null;
}): { primary: string; secondary: string } {
  return parseBrandColorStorage(page.brand_color, page.brand_color_secondary);
}
