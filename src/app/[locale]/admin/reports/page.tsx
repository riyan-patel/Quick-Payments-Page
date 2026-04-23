import { getTranslations, setRequestLocale } from "next-intl/server";
import { format, subDays } from "date-fns";
import { ReportsClient } from "@/components/admin/ReportsClient";
import { createClient } from "@/lib/supabase/server";
import type { PaymentPageRow, TransactionRow } from "@/types/qpp";

type Tx = TransactionRow & {
  payment_pages: Pick<PaymentPageRow, "title" | "slug"> | null;
};

type Props = { params: Promise<{ locale: string }> };

export default async function ReportsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("adminReports");

  const supabase = await createClient();
  const { data: pageList } = await supabase
    .from("payment_pages")
    .select("id, title, slug")
    .order("title", { ascending: true });

  const pages = (pageList ?? []) as Pick<PaymentPageRow, "id" | "title" | "slug">[];

  const today = new Date();
  const from = format(subDays(today, 30), "yyyy-MM-dd");
  const to = format(today, "yyyy-MM-dd");
  const start = new Date(`${from}T00:00:00.000Z`).toISOString();
  const end = new Date(`${to}T23:59:59.999Z`).toISOString();

  const { data: txData } = await supabase
    .from("transactions")
    .select("*, payment_pages(title, slug)")
    .gte("created_at", start)
    .lte("created_at", end)
    .order("created_at", { ascending: false })
    .limit(500);

  const initialRows = (txData ?? []) as Tx[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t("subtitle")}
        </p>
      </div>
      <ReportsClient
        pages={pages}
        initialRows={initialRows}
        initialFrom={from}
        initialTo={to}
      />
    </div>
  );
}
