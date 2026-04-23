"use client";

import { BarChart3, FileStack, LayoutDashboard, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { logout } from "@/app/admin/logout-action";
import { Button, buttonVariants } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { ThemeModeToggle } from "@/components/theme/ThemeModeToggle";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/admin", key: "dashboard" as const, icon: LayoutDashboard, end: true },
  { href: "/admin/pages", key: "pages" as const, icon: FileStack, end: false },
  { href: "/admin/reports", key: "reports" as const, icon: BarChart3, end: false },
] as const;

function isActive(pathname: string, href: string, end: boolean) {
  if (end) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminHeader() {
  const t = useTranslations("adminNav");
  const pathname = usePathname() ?? "";

  return (
    <header className="sticky top-0 z-40 border-b border-foreground/6 bg-card/75 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Link
          href="/admin"
          className="group flex items-center gap-2.5 rounded-xl no-underline outline-offset-4"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20">
            <LayoutDashboard className="size-4" strokeWidth={1.75} aria-hidden />
          </span>
          <span className="font-[family-name:var(--font-outfit)] text-lg font-semibold tracking-tight text-foreground">
            {t("brand")}
          </span>
        </Link>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <ThemeModeToggle />
          <LocaleSwitcher />
          <nav aria-label="Admin" className="flex flex-wrap items-center gap-1">
            {nav.map(({ href, key, icon: Icon, end }) => {
              const on = isActive(pathname, href, end);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    buttonVariants({ variant: on ? "default" : "ghost", size: "sm" }),
                    "gap-1.5 rounded-full px-3.5 no-underline",
                    on && "shadow-sm",
                    !on && "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5 opacity-80" strokeWidth={1.75} aria-hidden />
                  {t(key)}
                </Link>
              );
            })}
          </nav>
          <form action={logout} className="inline">
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-full border-foreground/12 bg-background/60 px-3.5 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="size-3.5" strokeWidth={1.75} aria-hidden />
              {t("signOut")}
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
