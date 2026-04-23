"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { Languages } from "lucide-react";

const labels: Record<string, string> = { en: "EN", es: "ES" };

export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span className="sr-only">{t("language")}</span>
      <div className="inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-background/80 p-0.5 text-xs font-medium shadow-sm">
        {routing.locales.map((loc) => {
          const on = loc === locale;
          return (
            <Link
              key={loc}
              href={pathname}
              locale={loc}
              className={cn(
                "inline-flex h-7 min-w-[2.25rem] items-center justify-center rounded-full px-2.5 text-[0.7rem] font-semibold no-underline transition-colors",
                on
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
              )}
              scroll={false}
            >
              {labels[loc] ?? loc.toUpperCase()}
            </Link>
          );
        })}
      </div>
      <Languages className="size-3.5 text-muted-foreground" aria-hidden />
    </div>
  );
}
