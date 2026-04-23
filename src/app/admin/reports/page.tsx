import { format, subDays } from "date-fns";
import { ReportsClient } from "@/components/admin/ReportsClient";
import { createClient } from "@/lib/supabase/server";
import type { PaymentPageRow, TransactionRow } from "@/types/qpp";

type Tx = TransactionRow & {
  payment_pages: Pick<PaymentPageRow, "title" | "slug"> | null;
};

export default async function ReportsPage() {
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Default view: last 30 days. Filter by date, page, and status; export CSV matches the
          current table. Breakdowns use GL codes on each transaction and Stripe payment method
          types.
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
