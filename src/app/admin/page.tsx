import Link from "next/link";
import { CheckCircle2, FileStack, Receipt } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const checklist = [
  "Create at least two payment pages with different amount modes.",
  "Use “Distribution” to copy the URL, iframe snippet, and QR code.",
  "Complete a test payment with Stripe test cards — then verify it in Reports.",
  "Confirm Resend delivers email (check spam; verify sender domain for production).",
] as const;

export default async function AdminHomePage() {
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
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Dashboard</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Signed in as{" "}
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
              Payment pages
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
              Manage pages →
            </Link>
          </CardContent>
        </Card>
        <Card className="group transition hover:-translate-y-0.5">
          <CardHeader className="pb-2">
            <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Receipt className="size-5" strokeWidth={1.5} />
            </div>
            <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Transactions
            </CardDescription>
            <CardTitle className="text-4xl font-bold tabular-nums tracking-tight">
              {txCount}
            </CardTitle>
            <p className="text-xs text-muted-foreground">Across your published pages</p>
          </CardHeader>
          <CardContent>
            <Link
              href="/admin/reports"
              className={cn(
                buttonVariants({ variant: "link" }),
                "h-auto p-0 text-base font-medium text-primary",
              )}
            >
              Open reports →
            </Link>
          </CardContent>
        </Card>
      </div>
      <Card className="border border-primary/15 bg-primary/[0.04]">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-primary">Demo checklist</CardTitle>
          <CardDescription>Ship a full test path before the demo or review.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm text-foreground/95">
            {checklist.map((line) => (
              <li key={line} className="flex gap-3 text-left">
                <CheckCircle2
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <span className="leading-relaxed">{line}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
