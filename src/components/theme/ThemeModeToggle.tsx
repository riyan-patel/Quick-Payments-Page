"use client";

import { useTheme } from "@teispace/next-themes";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Laptop, Moon, Sun } from "lucide-react";

export function ThemeModeToggle({ className }: { className?: string }) {
  const t = useTranslations("common");
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn("h-8 w-[5.5rem] flex-shrink-0 rounded-full border border-border/60", className)} />
    );
  }

  const effective = theme === "system" ? resolvedTheme : theme;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span className="sr-only">{t("theme")}</span>
      <div className="inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-background/80 p-0.5 shadow-sm">
        <Button
          type="button"
          size="icon"
          variant={theme === "light" || (theme === "system" && effective === "light") ? "secondary" : "ghost"}
          className="size-7 rounded-full"
          onClick={() => setTheme("light")}
          title={t("light")}
        >
          <Sun className="size-3.5" aria-hidden />
        </Button>
        <Button
          type="button"
          size="icon"
          variant={theme === "dark" || (theme === "system" && effective === "dark") ? "secondary" : "ghost"}
          className="size-7 rounded-full"
          onClick={() => setTheme("dark")}
          title={t("dark")}
        >
          <Moon className="size-3.5" aria-hidden />
        </Button>
        <Button
          type="button"
          size="icon"
          variant={theme === "system" ? "secondary" : "ghost"}
          className="size-7 rounded-full"
          onClick={() => setTheme("system")}
          title={t("system")}
        >
          <Laptop className="size-3.5" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
