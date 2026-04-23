"use client";

import { format } from "date-fns";
import { useCallback, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PaymentPageRow, TransactionRow } from "@/types/qpp";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Tx = TransactionRow & {
  payment_pages: Pick<PaymentPageRow, "title" | "slug"> | null;
};

export function ReportsClient({
  pages,
  initialRows,
  initialFrom,
  initialTo,
}: {
  pages: Pick<PaymentPageRow, "id" | "title" | "slug">[];
  initialRows: Tx[];
  /** Same range used for the server fetch — avoids SSR/client date drift and hydration mismatch. */
  initialFrom: string;
  initialTo: string;
}) {
  const [rows, setRows] = useState<Tx[]>(initialRows);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
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

  const selectFilter = cn(
    "flex h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none",
    "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
  );

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <Label htmlFor="rep-from" className="text-xs">
                From
              </Label>
              <Input
                id="rep-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-auto min-w-[10rem]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rep-to" className="text-xs">
                To
              </Label>
              <Input
                id="rep-to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-auto min-w-[10rem]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rep-page" className="text-xs">
                Payment page
              </Label>
              <select
                id="rep-page"
                value={pageId}
                onChange={(e) => setPageId(e.target.value)}
                className={cn(selectFilter, "min-w-[12rem]")}
              >
                <option value="">All pages</option>
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.slug})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rep-status" className="text-xs">
                Status
              </Label>
              <select
                id="rep-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={cn(selectFilter, "min-w-[9rem]")}
              >
                <option value="">All</option>
                <option value="succeeded">Succeeded</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button type="button" onClick={() => void load()}>
                Apply
              </Button>
              <Button type="button" variant="outline" onClick={exportCsv}>
                Export CSV
              </Button>
            </div>
          </div>
          <CardDescription className="mt-3">
            Data below matches the last applied filters. Click <strong>Apply</strong> after changing
            dates or filters.
          </CardDescription>
        </CardContent>
      </Card>

      {err ? (
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Successful payments</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{summary.count}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total collected</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                summary.total,
              )}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Average payment</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                summary.avg,
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By GL code</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {byGl.length === 0 ? (
                <li className="text-muted-foreground">No data for this filter.</li>
              ) : (
                byGl.map(([code, v]) => (
                  <li
                    key={code}
                    className="flex justify-between gap-2 border-b border-border py-1 last:border-0"
                  >
                    <span className="font-mono text-xs">{code}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {v.count} ×{" "}
                      {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                        v.amount,
                      )}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By payment method</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {byMethod.length === 0 ? (
                <li className="text-muted-foreground">No data for this filter.</li>
              ) : (
                byMethod.map(([m, v]) => (
                  <li
                    key={m}
                    className="flex justify-between gap-2 border-b border-border py-1 last:border-0"
                  >
                    <span>{m}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {v.count} ×{" "}
                      {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                        v.amount,
                      )}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase text-muted-foreground">
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
                      <td colSpan={5} className="py-6 text-center text-muted-foreground">
                        No rows match your filters. Adjust filters and click Apply.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => (
                      <tr key={r.id} className="border-b border-border">
                        <td className="py-2 pr-2 whitespace-nowrap text-muted-foreground">
                          {format(new Date(r.created_at), "PP p")}
                        </td>
                        <td className="py-2 pr-2">{r.payment_pages?.title ?? "—"}</td>
                        <td className="py-2 pr-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              r.status === "succeeded" &&
                                "border-emerald-200 bg-emerald-50 text-emerald-900",
                              r.status === "failed" && "border-red-200 bg-red-50 text-red-900",
                              r.status === "pending" && "border-amber-200 bg-amber-50 text-amber-900",
                            )}
                          >
                            {r.status}
                          </Badge>
                        </td>
                        <td className="py-2 pr-2 text-muted-foreground">
                          {r.payment_method_type ?? "—"}
                        </td>
                        <td className="py-2 pr-2 text-right tabular-nums font-medium">
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
        </CardContent>
      </Card>
    </div>
  );
}
