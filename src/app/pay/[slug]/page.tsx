import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaymentCheckout } from "@/components/payment/PaymentCheckout";
import { Card, CardContent } from "@/components/ui/card";
import { createPublicClient } from "@/lib/supabase/public";
import type { CustomFieldRow, PaymentPageRow } from "@/types/qpp";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("payment_pages")
    .select("title, subtitle")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return { title: "Payment page" };
  const p = data as Pick<PaymentPageRow, "title" | "subtitle">;
  return {
    title: `${p.title} — Pay`,
    description: p.subtitle ?? "Secure payment",
  };
}

export default async function PublicPayPage({ params }: Props) {
  const { slug } = await params;
  const supabase = createPublicClient();

  const { data: page, error } = await supabase
    .from("payment_pages")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !page) notFound();

  const p = page as PaymentPageRow;

  const { data: fieldsRaw } = await supabase
    .from("custom_fields")
    .select("*")
    .eq("page_id", p.id)
    .order("sort_order", { ascending: true });

  const fields = (fieldsRaw ?? []) as CustomFieldRow[];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const showBrandingColumn = Boolean(p.logo_url || p.trust_panel);

  return (
    <main
      id="pay-main"
      className={cn(
        "mx-auto px-4 py-8 sm:py-10 lg:py-12",
        showBrandingColumn ? "max-w-6xl" : "max-w-lg",
      )}
      lang="en"
    >
      <div
        className={cn(
          showBrandingColumn &&
            "lg:grid lg:grid-cols-[minmax(0,min(100%,480px))_minmax(0,1fr)] lg:items-start lg:gap-10 xl:gap-12 2xl:gap-16",
        )}
      >
        {showBrandingColumn ? (
          <aside
            aria-label="Organization and trust information"
            className="mb-8 flex flex-col gap-6 lg:mb-0 lg:max-w-none lg:pr-2"
          >
            <div className="rounded-2xl border border-border/80 bg-muted/30 p-6 sm:p-8 lg:sticky lg:top-8 lg:p-9">
              {p.logo_url ? (
                <div className="flex justify-center lg:justify-start">
                  <div className="flex w-full max-w-full items-center justify-center rounded-xl bg-background/95 p-6 shadow-sm ring-1 ring-border/60 sm:p-8 lg:justify-start lg:p-10">
                    <img
                      src={p.logo_url}
                      alt={`${p.title} logo`}
                      className="h-auto w-auto max-h-36 max-w-full object-contain sm:max-h-44 md:max-h-52 lg:max-h-64 xl:max-h-72 2xl:max-h-80"
                      sizes="(max-width: 1024px) 100vw, 480px"
                    />
                  </div>
                </div>
              ) : null}

              {p.trust_panel ? (
                <Card
                  aria-label="Trust and transparency"
                  className={cn(
                    "border-primary/20 bg-background/80 text-sm shadow-none backdrop-blur-sm",
                    p.logo_url && "mt-6",
                  )}
                >
                  <CardContent className="space-y-3 px-4 py-4 sm:px-5">
                    <h2 className="font-heading text-base font-semibold text-primary">
                      Why you can trust this page
                    </h2>
                    <p className="whitespace-pre-wrap text-foreground/90 leading-relaxed">
                      {p.trust_panel}
                    </p>
                    <ul className="list-inside list-disc space-y-1.5 text-muted-foreground leading-relaxed">
                      <li>Payments are processed securely by Stripe (test mode in demos).</li>
                      <li>Your card details are never stored on our servers.</li>
                      <li>You will receive a confirmation email after a successful payment.</li>
                    </ul>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </aside>
        ) : null}

        <div className="min-w-0 space-y-6">
          <header className="text-center lg:text-left">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {p.title}
            </h1>
            {p.subtitle ? (
              <p className="mt-2 text-base text-muted-foreground sm:text-lg">{p.subtitle}</p>
            ) : null}
            {p.header_message ? (
              <Card className="mt-4 text-left shadow-none">
                <CardContent className="py-3 text-sm leading-relaxed">{p.header_message}</CardContent>
              </Card>
            ) : null}
          </header>

          <PaymentCheckout page={p} fields={fields} />

          {p.footer_message ? (
            <footer className="border-t border-border pt-6 text-center text-xs text-muted-foreground lg:text-left">
              {p.footer_message}
            </footer>
          ) : null}

          {!appUrl ? null : (
            <p className="text-center text-xs text-muted-foreground lg:text-left">
              Powered by Quick Payment Pages
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
