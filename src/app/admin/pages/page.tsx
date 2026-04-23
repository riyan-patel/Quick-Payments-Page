import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { PaymentPageRow } from "@/types/qpp";
import { displayAmountMode } from "@/app/admin/actions";

export default async function AdminPagesListPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_pages")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return <p className="text-red-800">Could not load pages: {error.message}</p>;
  }

  const pages = (data ?? []) as PaymentPageRow[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-zinc-900">Payment pages</h1>
        <Link
          href="/admin/pages/new"
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-900"
        >
          New page
        </Link>
      </div>
      {pages.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-white p-8 text-center text-zinc-600">
          No pages yet.{" "}
          <Link href="/admin/pages/new" className="font-medium text-teal-800 underline">
            Create your first payment page
          </Link>
          .
        </p>
      ) : (
        <ul className="space-y-3">
          {pages.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div>
                <p className="font-semibold text-zinc-900">{p.title}</p>
                <p className="text-sm text-zinc-600">
                  /pay/{p.slug} · {displayAmountMode(p.amount_mode)}
                  {!p.is_active ? (
                    <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                      Inactive
                    </span>
                  ) : (
                    <span className="ml-2 rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-900">
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
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800"
                >
                  Open public page
                </Link>
                <Link
                  href={`/admin/pages/${p.id}/edit`}
                  className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white"
                >
                  Edit
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
