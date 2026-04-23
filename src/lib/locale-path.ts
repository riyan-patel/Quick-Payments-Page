import { routing as routingConfig } from "@/i18n/routing";

const NON_DEFAULT = routingConfig.locales.filter((l) => l !== routingConfig.defaultLocale);

/**
 * Strips a leading locale from the path for auth checks (e.g. `/es/admin` → `/admin`).
 */
export function getPathnameWithoutLocale(pathname: string): string {
  for (const loc of NON_DEFAULT) {
    if (pathname === `/${loc}`) return "/";
    if (pathname.startsWith(`/${loc}/`)) {
      return pathname.slice(loc.length + 1) || "/";
    }
  }
  return pathname;
}

/**
 * Picks a locale for redirects from a pathname that may include a prefix (e.g. `es` for `/es/...`).
 */
export function getLocaleFromPathname(pathname: string): (typeof routingConfig.locales)[number] {
  for (const loc of NON_DEFAULT) {
    if (pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)) {
      return loc;
    }
  }
  return routingConfig.defaultLocale;
}

export function withLocalePath(
  locale: (typeof routingConfig.locales)[number],
  path: `/${string}`,
): string {
  if (locale === routingConfig.defaultLocale) return path;
  if (path === "/") return `/${locale}`;
  return `/${locale}${path}`;
}
