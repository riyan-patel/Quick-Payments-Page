import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PayTrustPills } from "@/components/pay/PayTrustPills";
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
      className="mx-auto max-w-lg px-4 py-12 text-center sm:max-w-xl sm:py-20"
      lang="en"
    >
      <div className="mb-6">
        <PayTrustPills />
      </div>
      <Card
        className="overflow-hidden border-foreground/8 bg-[color:var(--qpp-glass)] text-foreground shadow-[0_1px_0_rgba(255,255,255,0.85)_inset,0_32px_80px_-28px_rgba(0,0,0,0.2),0_8px_24px_-8px_rgba(0,0,0,0.1)] backdrop-blur-2xl backdrop-saturate-150"
        role="status"
        aria-live="polite"
      >
        <div
          className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-600"
          role="presentation"
        />
        <CardContent className="space-y-5 px-6 py-10 sm:px-10 sm:py-12">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/20 to-green-600/20 ring-1 ring-emerald-500/20">
            <CircleCheck
              className="size-9 text-emerald-600"
              strokeWidth={1.5}
              aria-hidden
            />
          </div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-emerald-700/80">
            Success
          </p>
          <h1 className="pay-font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Payment received
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Thank you. If email confirmation is enabled for this page, check your inbox (and spam)
            for a receipt.
          </p>
          {id ? (
            <p className="text-sm text-muted-foreground">
              Reference:{" "}
              <span className="font-mono text-foreground" id="txn-ref">
                {id}
              </span>
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            Keep this page or your email receipt for your records.
          </p>
        </CardContent>
      </Card>
      <p className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href={payUrl}
          className={cn(
            buttonVariants({ size: "lg" }),
            "pay-font-display h-12 rounded-full px-8 text-base no-underline shadow-[0_8px_24px_rgba(0,0,0,0.15)]",
          )}
        >
          Return to payment page
        </Link>
        <span className="max-w-sm text-sm text-muted-foreground">
          Same link you used to pay — for another payment or details.
        </span>
      </p>
    </main>
  );
}
