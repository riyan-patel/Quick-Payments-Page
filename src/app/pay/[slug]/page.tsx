import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaymentCheckout } from "@/components/payment/PaymentCheckout";
import { createPublicClient } from "@/lib/supabase/public";
import type { CustomFieldRow, PaymentPageRow } from "@/types/qpp";

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

  return (
    <main
      id="pay-main"
      className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-10"
      lang="en"
    >
      <header className="text-center">
        {p.logo_url ? (
          <div className="mb-4 flex justify-center">
            <img
              src={p.logo_url}
              alt=""
              className="h-14 w-auto max-w-[200px] object-contain"
              width={200}
              height={56}
            />
          </div>
        ) : null}
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{p.title}</h1>
        {p.subtitle ? (
          <p className="mt-2 text-base text-zinc-600">{p.subtitle}</p>
        ) : null}
        {p.header_message ? (
          <p className="mt-4 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800">
            {p.header_message}
          </p>
        ) : null}
      </header>

      {p.trust_panel ? (
        <section
          aria-label="Trust and transparency"
          className="rounded-xl border border-teal-200 bg-teal-50/80 px-4 py-3 text-sm text-teal-950"
        >
          <h2 className="font-semibold text-teal-900">Why you can trust this page</h2>
          <p className="mt-2 whitespace-pre-wrap text-teal-950/90">{p.trust_panel}</p>
          <ul className="mt-3 list-inside list-disc space-y-1 text-teal-900/90">
            <li>Payments are processed securely by Stripe (test mode in demos).</li>
            <li>Your card details are never stored on our servers.</li>
            <li>You will receive a confirmation email after a successful payment.</li>
          </ul>
        </section>
      ) : null}

      <PaymentCheckout page={p} fields={fields} />

      {p.footer_message ? (
        <footer className="border-t border-zinc-200 pt-6 text-center text-xs text-zinc-600">
          {p.footer_message}
        </footer>
      ) : null}

      {!appUrl ? null : (
        <p className="text-center text-xs text-zinc-500">Powered by Quick Payment Pages</p>
      )}
    </main>
  );
}
