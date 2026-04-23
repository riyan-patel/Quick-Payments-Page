import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  const core = (await import(`../messages/${locale}.json`)).default;
  const editor = (await import(`../messages/${locale}/editor.json`)).default;
  return {
    locale,
    messages: { ...core, editor },
  };
});
