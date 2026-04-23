import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{user?.email}</span>
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Payment pages</CardDescription>
            <CardTitle className="text-3xl font-bold tabular-nums">
              {pageCount ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href="/admin/pages"
              className={cn(buttonVariants({ variant: "link" }), "h-auto p-0 text-primary")}
            >
              Manage pages
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Transactions (your pages)</CardDescription>
            <CardTitle className="text-3xl font-bold tabular-nums">{txCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href="/admin/reports"
              className={cn(buttonVariants({ variant: "link" }), "h-auto p-0 text-primary")}
            >
              Open reports
            </Link>
          </CardContent>
        </Card>
      </div>
      <Card className="border-primary/25 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base text-primary">Demo checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-1 text-sm text-foreground/90">
            <li>Create at least two payment pages with different amount modes.</li>
            <li>Use “Distribution” to copy the URL, iframe snippet, and QR code.</li>
            <li>Complete a test payment with Stripe test cards — then verify it in Reports.</li>
            <li>Confirm Resend delivers email (check spam; verify sender domain for production).</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
