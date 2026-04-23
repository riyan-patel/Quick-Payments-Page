import { ExternalLink, Pencil, Plus } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { PaymentPageRow } from "@/types/qpp";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ locale: string }> };

function amountModeLabel(
  t: (key: "amountModeFixed" | "amountModeRange" | "amountModeOpen") => string,
  mode: PaymentPageRow["amount_mode"],
) {
  if (mode === "fixed") return t("amountModeFixed");
  if (mode === "range") return t("amountModeRange");
  return t("amountModeOpen");
}

export default async function AdminPagesListPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("adminPages");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_pages")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return (
      <Alert variant="destructive" className="rounded-2xl">
        <AlertDescription>{t("loadError", { message: error.message })}</AlertDescription>
      </Alert>
    );
  }

  const pages = (data ?? []) as PaymentPageRow[];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link
          href="/admin/pages/new"
          className={cn(
            buttonVariants({ size: "default" }),
            "inline-flex w-full items-center justify-center gap-1.5 rounded-full shadow-sm no-underline sm:w-auto",
          )}
        >
          <Plus className="size-4" strokeWidth={1.75} aria-hidden />
          {t("newPage")}
        </Link>
      </div>
      {pages.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">
              {t("empty")}{" "}
              <Link
                href="/admin/pages/new"
                className={cn(
                  buttonVariants({ variant: "link" }),
                  "h-auto p-0 text-base text-primary",
                )}
              >
                {t("emptyCta")}
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {pages.map((p) => (
            <li key={p.id}>
              <Card className="transition hover:-translate-y-px">
                <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:py-4">
                  <div className="min-w-0">
                    <p className="font-[family-name:var(--font-outfit)] text-lg font-semibold text-foreground">
                      {p.title}
                    </p>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      <code className="rounded-md bg-muted/80 px-1.5 py-0.5 text-xs text-foreground/90">
                        /pay/{p.slug}
                      </code>
                      <span className="mx-2">·</span>
                      {amountModeLabel(t, p.amount_mode)}{" "}
                      {!p.is_active ? (
                        <span className="ml-2 inline-flex items-center rounded-full border border-foreground/10 bg-secondary px-2.5 py-0.5 text-xs font-medium">
                          {t("inactive")}
                        </span>
                      ) : (
                        <span className="ml-2 inline-flex items-center rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-900">
                          {t("active")}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 flex-wrap gap-2">
                    <Link
                      href={`/pay/${p.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "inline-flex gap-1.5 rounded-full border-foreground/12 bg-card/40 font-medium no-underline shadow-sm transition",
                        "hover:border-foreground/20 hover:bg-card hover:shadow",
                      )}
                    >
                      <ExternalLink className="size-3.5" strokeWidth={1.75} aria-hidden />
                      {t("open")}
                    </Link>
                    <Link
                      href={`/admin/pages/${p.id}/edit`}
                      className={cn(
                        buttonVariants({ size: "sm" }),
                        "inline-flex gap-1.5 rounded-full no-underline",
                      )}
                    >
                      <Pencil className="size-3.5" strokeWidth={1.75} aria-hidden />
                      {t("edit")}
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
