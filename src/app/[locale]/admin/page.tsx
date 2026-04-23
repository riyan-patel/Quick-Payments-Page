import { FileStack, Receipt } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminHomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("adminDashboard");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { count: pageCount } = await supabase
    .from("payment_pages")
    .select("*", { count: "exact", head: true })
    .eq("created_by", user!.id);

  const { data: pageIds } = await supabase
    .from("payment_pages")
    .select("id")
    .eq("created_by", user!.id);

  const ids = (pageIds ?? []).map((r) => r.id);
  let txCount = 0;
  if (ids.length) {
    const { count } = await supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .in("page_id", ids);
    txCount = count ?? 0;
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h1>
        <p className="mt-2 text-base text-muted-foreground">
          {t("signedInAs")}{" "}
          <span className="font-medium text-foreground">{user?.email}</span>
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="group transition hover:-translate-y-0.5">
          <CardHeader className="pb-2">
            <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileStack className="size-5" strokeWidth={1.5} />
            </div>
            <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("pagesCard")}
            </CardDescription>
            <CardTitle className="text-4xl font-bold tabular-nums tracking-tight">
              {pageCount ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href="/admin/pages"
              className={cn(
                buttonVariants({ variant: "link" }),
                "h-auto p-0 text-base font-medium text-primary",
              )}
            >
              {t("managePages")}
            </Link>
          </CardContent>
        </Card>
        <Card className="group transition hover:-translate-y-0.5">
          <CardHeader className="pb-2">
            <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Receipt className="size-5" strokeWidth={1.5} />
            </div>
            <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("txCard")}
            </CardDescription>
            <CardTitle className="text-4xl font-bold tabular-nums tracking-tight">
              {txCount}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{t("acrossPages")}</p>
          </CardHeader>
          <CardContent>
            <Link
              href="/admin/reports"
              className={cn(
                buttonVariants({ variant: "link" }),
                "h-auto p-0 text-base font-medium text-primary",
              )}
            >
              {t("openReports")}
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
