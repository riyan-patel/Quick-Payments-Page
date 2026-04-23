import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { displayAmountMode } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/server";
import type { PaymentPageRow } from "@/types/qpp";
import { cn } from "@/lib/utils";

export default async function AdminPagesListPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_pages")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Could not load pages: {error.message}</AlertDescription>
      </Alert>
    );
  }

  const pages = (data ?? []) as PaymentPageRow[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Payment pages</h1>
        <Link
          href="/admin/pages/new"
          className={cn(buttonVariants({ size: "default" }), "no-underline")}
        >
          New page
        </Link>
      </div>
      {pages.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No pages yet.{" "}
            <Link
              href="/admin/pages/new"
              className={cn(
                buttonVariants({ variant: "link" }),
                "h-auto p-0 text-primary",
              )}
            >
              Create your first payment page
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {pages.map((p) => (
            <li key={p.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-semibold">{p.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      /pay/{p.slug} · {displayAmountMode(p.amount_mode)}{" "}
                      {!p.is_active ? (
                        <span className="ml-2 inline-flex items-center rounded-full border border-transparent bg-secondary px-2 py-0.5 text-xs font-medium align-middle">
                          Inactive
                        </span>
                      ) : (
                        <span className="ml-2 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-900 align-middle dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100">
                          Active
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/pay/${p.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "no-underline")}
                    >
                      Open public page
                    </Link>
                    <Link
                      href={`/admin/pages/${p.id}/edit`}
                      className={cn(buttonVariants({ size: "sm" }), "no-underline")}
                    >
                      Edit
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
