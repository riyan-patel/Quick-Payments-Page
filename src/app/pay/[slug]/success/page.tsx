import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ id?: string }>;
};

export default async function PaySuccessPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { id } = await searchParams;
  const payUrl = `/pay/${slug}`;

  return (
    <main
      id="pay-main"
      className="mx-auto max-w-lg px-4 py-16 text-center"
      lang="en"
    >
      <Card
        className="border-emerald-200 bg-emerald-50 text-emerald-950 shadow-md dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-50"
        role="status"
        aria-live="polite"
      >
        <CardContent className="space-y-3 py-8">
          <h1 className="text-xl font-bold">Payment received</h1>
          <p className="text-emerald-900/90 dark:text-emerald-100/90">
            Thank you. If email confirmation is enabled for this page, check your inbox (and spam)
            for a receipt.
          </p>
          {id ? (
            <p className="text-sm text-emerald-900/80 dark:text-emerald-100/80">
              Reference:{" "}
              <span className="font-mono" id="txn-ref">
                {id}
              </span>
            </p>
          ) : null}
          <p className="text-sm text-emerald-900/80 dark:text-emerald-100/80">
            Keep this page or your email receipt for your records.
          </p>
        </CardContent>
      </Card>
      <p className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link href={payUrl} className={cn(buttonVariants({ size: "lg" }), "no-underline")}>
          Return to payment page
        </Link>
        <span className="text-sm text-muted-foreground">
          Same link you used to pay — for another payment or details.
        </span>
      </p>
    </main>
  );
}
