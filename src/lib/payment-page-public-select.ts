/**
 * payment_pages columns safe for anon/public `select` on /pay and /embed.
 * Excludes email templates and payee contact fields (use server-only routes for those).
 */
export const PAYMENT_PAGE_PUBLIC_SELECT = [
  "id",
  "slug",
  "title",
  "subtitle",
  "header_message",
  "trust_panel",
  "logo_url",
  "brand_color",
  "brand_color_secondary",
  "amount_mode",
  "fixed_amount",
  "min_amount",
  "max_amount",
  "gl_codes",
  "is_active",
].join(",");
