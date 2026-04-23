"use client";

import { format } from "date-fns";
import { useCallback, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PaymentPageRow, TransactionRow } from "@/types/qpp";

type Tx = TransactionRow & {
  payment_pages: Pick<PaymentPageRow, "title" | "slug"> | null;
};

export function ReportsClient({
  pages,
  initialRows,
}: {
  pages: Pick<PaymentPageRow, "id" | "title" | "slug">[];
  initialRows: Tx[];
}) {
  const [rows, setRows] = useState<Tx[]>(initialRows);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [from, setFrom] = useState(() => format(new Date(Date.now() - 30 * 86400000), "yyyy-MM-dd"));
  const [to, setTo] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [pageId, setPageId] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const sb = createClient();
      let q = sb
        .from("transactions")
        .select("*, payment_pages(title, slug)")
        .order("created_at", { ascending: false })
        .limit(500);

      const start = new Date(`${from}T00:00:00.000Z`).toISOString();
      const end = new Date(`${to}T23:59:59.999Z`).toISOString();
      q = q.gte("created_at", start).lte("created_at", end);

      if (pageId) q = q.eq("page_id", pageId);
      if (status) q = q.eq("status", status);

      const { data, error } = await q;
      if (error) throw error;
      setRows((data ?? []) as Tx[]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
      setRows([]);
    }
    setLoading(false);
  }, [from, to, pageId, status]);

  const filtered = useMemo(() => rows, [rows]);

  const summary = useMemo(() => {
    const ok = filtered.filter((r) => r.status === "succeeded");
    const total = ok.reduce((s, r) => s + Number(r.amount), 0);
    const count = ok.length;
    const avg = count ? total / count : 0;
    return { count, total, avg };
  }, [filtered]);

  const byGl = useMemo(() => {
    const m = new Map<string, { count: number; amount: number }>();
    for (const r of filtered) {
      if (r.status !== "succeeded") continue;
      const codes = r.gl_codes_snapshot?.length ? r.gl_codes_snapshot : ["(none)"];
      for (const c of codes) {
        const cur = m.get(c) ?? { count: 0, amount: 0 };
        cur.count += 1;
        cur.amount += Number(r.amount);
        m.set(c, cur);
      }
    }
    return [...m.entries()].sort((a, b) => b[1].amount - a[1].amount);
  }, [filtered]);

  const byMethod = useMemo(() => {
    const m = new Map<string, { count: number; amount: number }>();
    for (const r of filtered) {
      if (r.status !== "succeeded") continue;
      const k = r.payment_method_type ?? "unknown";
      const cur = m.get(k) ?? { count: 0, amount: 0 };
      cur.count += 1;
      cur.amount += Number(r.amount);
      m.set(k, cur);
    }
    return [...m.entries()].sort((a, b) => b[1].amount - a[1].amount);
  }, [filtered]);

  const exportCsv = () => {
    const header = [
      "created_at",
      "status",
      "amount",
      "currency",
      "payment_method",
      "payer_email",
      "page",
      "gl_codes",
      "transaction_id",
    ];
    const lines = filtered.map((r) =>
      [
        r.created_at,
        r.status,
        r.amount,
        r.currency,
        r.payment_method_type ?? "",
        r.payer_email ?? "",
        r.payment_pages?.title ?? "",
        (r.gl_codes_snapshot ?? []).join(";"),
        r.id,
      ]
        .map((c) => `"${String(c).replaceAll('"', '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `qpp-transactions-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Filters</h2>
        <div className="mt-4 flex flex-wrap gap-4">
          <div className="space-y-1">
            <label htmlFor="rep-from" className="text-xs font-medium text-zinc-700">
              From
            </label>
            <input
              id="rep-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 shadow-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="rep-to" className="text-xs font-medium text-zinc-700">
              To
            </label>
            <input
              id="rep-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 shadow-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="rep-page" className="text-xs font-medium text-zinc-700">
              Payment page
            </label>
            <select
              id="rep-page"
              value={pageId}
              onChange={(e) => setPageId(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 shadow-sm"
            >
              <option value="">All pages</option>
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.slug})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="rep-status" className="text-xs font-medium text-zinc-700">
              Status
            </label>
            <select
              id="rep-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 shadow-sm"
            >
              <option value="">All</option>
              <option value="succeeded">Succeeded</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800"
            >
              Export CSV
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Data below matches the last applied filters. Click <strong>Apply</strong> after changing
          dates or filters.
        </p>
      </section>

      {err ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900">
          {err}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-zinc-600">Successful payments</h3>
          <p className="mt-2 text-2xl font-bold tabular-nums text-zinc-900">{summary.count}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-zinc-600">Total collected</h3>
          <p className="mt-2 text-2xl font-bold tabular-nums text-zinc-900">
            {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
              summary.total,
            )}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-zinc-600">Average payment</h3>
          <p className="mt-2 text-2xl font-bold tabular-nums text-zinc-900">
            {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
              summary.avg,
            )}
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-zinc-900">By GL code</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {byGl.length === 0 ? (
              <li className="text-zinc-500">No data for this filter.</li>
            ) : (
              byGl.map(([code, v]) => (
                <li key={code} className="flex justify-between gap-2 border-b border-zinc-100 py-1">
                  <span className="font-mono text-xs text-zinc-800">{code}</span>
                  <span className="tabular-nums text-zinc-700">
                    {v.count} ×{" "}
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                      v.amount,
                    )}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-zinc-900">By payment method</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {byMethod.length === 0 ? (
              <li className="text-zinc-500">No data for this filter.</li>
            ) : (
              byMethod.map(([m, v]) => (
                <li key={m} className="flex justify-between gap-2 border-b border-zinc-100 py-1">
                  <span className="text-zinc-800">{m}</span>
                  <span className="tabular-nums text-zinc-700">
                    {v.count} ×{" "}
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                      v.amount,
                    )}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-900">Transactions</h3>
        {loading ? (
          <p className="mt-4 text-sm text-zinc-600">Loading…</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                  <th scope="col" className="py-2 pr-2">
                    Date
                  </th>
                  <th scope="col" className="py-2 pr-2">
                    Page
                  </th>
                  <th scope="col" className="py-2 pr-2">
                    Status
                  </th>
                  <th scope="col" className="py-2 pr-2">
                    Method
                  </th>
                  <th scope="col" className="py-2 pr-2 text-right">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-zinc-500">
                      No rows match your filters. Adjust filters and click Apply.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id} className="border-b border-zinc-100">
                      <td className="py-2 pr-2 whitespace-nowrap text-zinc-700">
                        {format(new Date(r.created_at), "PP p")}
                      </td>
                      <td className="py-2 pr-2 text-zinc-800">
                        {r.payment_pages?.title ?? "—"}
                      </td>
                      <td className="py-2 pr-2">
                        <span
                          className={
                            r.status === "succeeded"
                              ? "text-emerald-800"
                              : r.status === "failed"
                                ? "text-red-800"
                                : "text-amber-800"
                          }
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2 pr-2 text-zinc-700">{r.payment_method_type ?? "—"}</td>
                      <td className="py-2 pr-2 text-right tabular-nums text-zinc-900">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                        }).format(Number(r.amount))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
