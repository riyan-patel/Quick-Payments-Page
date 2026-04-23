import Link from "next/link";

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
      <div
        role="status"
        aria-live="polite"
        className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-8"
      >
        <h1 className="text-xl font-bold text-emerald-950">Payment received</h1>
        <p className="mt-3 text-emerald-900/90">
          Thank you. If email confirmation is enabled for this page, check your inbox (and spam)
          for a receipt.
        </p>
        {id ? (
          <p className="mt-4 text-sm text-emerald-900/80">
            Reference:{" "}
            <span className="font-mono" id="txn-ref">
              {id}
            </span>
          </p>
        ) : null}
        <p className="mt-6 text-sm text-emerald-900/80">
          Keep this page or your email receipt for your records.
        </p>
      </div>
      <p className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href={payUrl}
          className="inline-flex rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-900"
        >
          Return to payment page
        </Link>
        <span className="text-sm text-zinc-500">Same link you used to pay — for another payment or details.</span>
      </p>
    </main>
  );
}
