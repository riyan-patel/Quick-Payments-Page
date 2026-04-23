"use client";

import { useLocale } from "next-intl";
import { useEffect } from "react";

/**
 * Sets <html lang> from the active next-intl locale (root layout keeps required tags).
 */
export function DocumentLocaleAttributes() {
  const locale = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
