import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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
        <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
        <p className="mt-2 text-zinc-600">
          Signed in as <span className="font-medium text-zinc-800">{user?.email}</span>
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-zinc-500">Payment pages</h2>
          <p className="mt-2 text-3xl font-bold tabular-nums text-zinc-900">{pageCount ?? 0}</p>
          <Link
            href="/admin/pages"
            className="mt-4 inline-block text-sm font-medium text-teal-800 underline"
          >
            Manage pages
          </Link>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-zinc-500">Transactions (your pages)</h2>
          <p className="mt-2 text-3xl font-bold tabular-nums text-zinc-900">{txCount}</p>
          <Link
            href="/admin/reports"
            className="mt-4 inline-block text-sm font-medium text-teal-800 underline"
          >
            Open reports
          </Link>
        </div>
      </div>
      <section className="rounded-xl border border-teal-200 bg-teal-50/80 p-6 text-sm text-teal-950">
        <h2 className="font-semibold text-teal-900">Demo checklist</h2>
        <ul className="mt-3 list-inside list-disc space-y-1">
          <li>Create at least two payment pages with different amount modes.</li>
          <li>Use “Distribution” to copy the URL, iframe snippet, and QR code.</li>
          <li>Complete a test payment with Stripe test cards — then verify it in Reports.</li>
          <li>Confirm Resend delivers email (check spam; verify sender domain for production).</li>
        </ul>
      </section>
    </div>
  );
}
