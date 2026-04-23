import { formatInTimeZone } from "date-fns-tz";
import type { ReportTx } from "@/lib/reports-ask-payload";
import {
  localCalendarDayWindowMs,
  localDateKey,
  localMonthBoundsMs,
  localPreviousMonthBoundsMs,
  localQuarterBoundsMs,
  localYmdInZone,
  localTimeRangeOnLocalDayMs,
  localYearBoundsMs,
  type ReportAskRunContext,
} from "@/lib/tz-bounds";

export type { ReportAskRunContext };

/** Slots extracted from natural language; only fields relevant to a template need to be set. */
export type ReportAskSlots = {
  year?: number;
  month?: number;
  day?: number;
  quarter?: 1 | 2 | 3 | 4;
  year_start?: number;
  month_start?: number;
  year_end?: number;
  month_end?: number;
  last_days?: number;
  limit?: number;
  page_contains?: string;
  payer_contains?: string;
  status_scope?: "succeeded" | "failed" | "pending" | "all";
  /** Inclusive local start time on that calendar day (e.g. 13 for 1:00 PM). */
  local_hour_start?: number;
  local_minute_start?: number;
  /** Exclusive local end time on that calendar day (e.g. 13 for "before 1:00 PM", or 15 for end of a 1–3pm range). */
  local_hour_end?: number;
  local_minute_end?: number;
  /** Substring to match in payer email (e.g. gatech.edu) — case-insensitive. */
  email_domain_contains?: string;
  /** Substring anywhere in payer email. */
  email_contains?: string;
  /** Substring in payer name (e.g. "John"). */
  payer_name_contains?: string;
};

export type SqlPreviewRow =
  | { kind: "scalar"; label: string; value: string; sql: string }
  | {
      kind: "table";
      columns: string[];
      rows: (string | number)[][];
      sql: string;
    };

const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

function inRange(iso: string, start: number, endEx: number): boolean {
  const t = new Date(iso).getTime();
  return t >= start && t < endEx;
}

function pageTitle(r: ReportTx): string {
  return r.payment_pages?.title?.trim() || "—";
}

function matchStatus(
  r: ReportTx,
  scope: "succeeded" | "failed" | "pending" | "all",
): boolean {
  if (scope === "all") return true;
  return r.status === scope;
}

function filterRows(
  rows: ReportTx[],
  start: number,
  endEx: number,
  status: "succeeded" | "failed" | "pending" | "all",
) {
  return rows.filter(
    (r) => inRange(r.created_at, start, endEx) && matchStatus(r, status),
  );
}

function sumAmount(rs: ReportTx[]) {
  return rs.reduce((s, r) => s + Number(r.amount), 0);
}

const fmtMoney = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const fmtPct = (n: number) =>
  `${n.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 0 })}%`;

function emailDomainPart(email: string | null | undefined): string | null {
  if (!email || !String(email).includes("@")) return null;
  return String(email).split("@").pop()?.toLowerCase().trim() ?? null;
}

function succeededInScope(
  rows: ReportTx[],
  s: ReportAskSlots,
  ctx: ReportAskRunContext,
): ReportTx[] {
  if (s.year != null && s.month != null) {
    const { startMs, endExMs } = localMonthBoundsMs(ctx.timeZone, s.year, s.month);
    return filterRows(rows, startMs, endExMs, "succeeded");
  }
  return rows.filter((r) => r.status === "succeeded");
}

type ExecOut = { sql: string; result: SqlPreviewRow };

const DEFAULT_LIMIT = 5;

function totalRevenueCalendarDayInner(
  rows: ReportTx[],
  s: ReportAskSlots,
  tz: string,
): ExecOut | null {
  if (s.year == null || s.month == null || s.day == null) return null;
  const st = s.status_scope ?? "succeeded";
  const hStart = s.local_hour_start;
  const hEnd = s.local_hour_end;
  const mStart = s.local_minute_start ?? 0;
  const mEnd = s.local_minute_end ?? 0;
  const hasStart = hStart != null && hStart >= 0 && hStart <= 23;
  const hasEnd = hEnd != null && hEnd >= 0 && hEnd <= 23;

  let w: { startMs: number; endExMs: number };
  if (hasStart && hasEnd) {
    w = localTimeRangeOnLocalDayMs(
      tz,
      s.year,
      s.month,
      s.day,
      hStart!,
      mStart,
      hEnd!,
      mEnd,
    );
    if (w.endExMs <= w.startMs) return null;
  } else if (hasEnd && !hasStart) {
    w = localCalendarDayWindowMs(tz, s.year, s.month, s.day, {
      hour: hEnd!,
      minute: mEnd,
    });
  } else {
    w = localCalendarDayWindowMs(tz, s.year, s.month, s.day, "full");
  }

  const f = filterRows(rows, w.startMs, w.endExMs, st);
  const tot = sumAmount(f);
  const sql = `-- ${tz} wall → UTC [${new Date(w.startMs).toISOString()}, ${new Date(w.endExMs).toISOString()}) for DB compare`;
  let label: string;
  if (hasStart && hasEnd) {
    label = `Succeeded total (local ${hStart}:${String(mStart).padStart(2, "0")}–${hEnd}:${String(mEnd).padStart(2, "0")} exclusive end)`;
  } else if (hasEnd && !hasStart) {
    label = `Succeeded total (local day through before ${hEnd}:${String(mEnd).padStart(2, "0")})`;
  } else {
    label = "Succeeded total (your full local calendar day)";
  }
  return {
    sql,
    result: { kind: "scalar", label, value: fmtMoney(tot), sql },
  };
}

const T: Record<
  string,
  (rows: ReportTx[], s: ReportAskSlots, ctx: ReportAskRunContext) => ExecOut | null
> = {
  total_revenue_month: (rows, s, ctx) => {
    if (s.year == null || s.month == null) return null;
    const { startMs: a, endExMs: b } = localMonthBoundsMs(ctx.timeZone, s.year, s.month);
    const st = s.status_scope ?? "succeeded";
    const f = filterRows(rows, a, b, st);
    const total = sumAmount(f);
    const startIso = new Date(a).toISOString();
    const endIso = new Date(b).toISOString();
    const sql = `-- Total amount (${st}) in ${s.year}-${pad2(s.month)}
SELECT COALESCE(SUM(amount), 0) AS total
FROM transactions
WHERE created_at >= '${startIso}' AND created_at < '${endIso}' AND status = '${st}';`;
    return {
      sql,
      result: {
        kind: "scalar",
        label: `Total (${st})`,
        value: fmtMoney(total),
        sql,
      },
    };
  },
  total_revenue_year: (rows, s, ctx) => {
    if (s.year == null) return null;
    const { startMs: a, endExMs: b } = localYearBoundsMs(ctx.timeZone, s.year);
    const st = s.status_scope ?? "succeeded";
    const f = filterRows(rows, a, b, st);
    const total = sumAmount(f);
    const startIso = new Date(a).toISOString();
    const endIso = new Date(b).toISOString();
    const sql = `-- Total amount (${st}) in ${s.year} (${ctx.timeZone} local year)
SELECT COALESCE(SUM(amount), 0) AS total
FROM transactions
WHERE created_at >= '${startIso}'
  AND created_at < '${endIso}'
  AND status = '${st}';`;
    return { sql, result: { kind: "scalar", label: `Total (${st}) in ${s.year}`, value: fmtMoney(total), sql } };
  },
  total_revenue_quarter: (rows, s, ctx) => {
    if (s.year == null || s.quarter == null) return null;
    const { startMs: a, endExMs: b } = localQuarterBoundsMs(ctx.timeZone, s.year, s.quarter);
    const st = s.status_scope ?? "succeeded";
    const f = filterRows(rows, a, b, st);
    const total = sumAmount(f);
    const sql = `-- Q${s.quarter} ${s.year} total (${st}) in ${ctx.timeZone}
-- ${new Date(a).toISOString()} .. ${new Date(b).toISOString()}`;
    return {
      sql: `${sql}\nSELECT COALESCE(SUM(amount),0) FROM transactions WHERE created_at >= ... AND status='${st}';`,
      result: {
        kind: "scalar",
        label: `Q${s.quarter} ${s.year} total`,
        value: fmtMoney(total),
        sql: `${sql}\n(aggregated in app)`,
      },
    };
  },
  total_revenue_last_n_days: (rows, s, ctx) => {
    const d = s.last_days;
    if (d == null || d < 1) return null;
    const end = Date.now();
    const start = end - d * 86_400_000;
    const st = s.status_scope ?? "succeeded";
    const f = filterRows(rows, start, end + 1, st);
    const total = sumAmount(f);
    const sql = `-- Total (${st}) in the last ${d} day(s) (from now, UTC, approximated in app)`;
    return {
      sql,
      result: { kind: "scalar", label: `Last ${d} days (${st})`, value: fmtMoney(total), sql },
    };
  },
  count_payments_month: (rows, s, ctx) => {
    if (s.year == null || s.month == null) return null;
    const { startMs: a, endExMs: b } = localMonthBoundsMs(ctx.timeZone, s.year, s.month);
    const st = s.status_scope ?? "succeeded";
    const f = filterRows(rows, a, b, st);
    const sql = `SELECT COUNT(*) FROM transactions
WHERE created_at >= '${s.year}-${pad2(s.month)}-01' AND created_at < ... AND status='${st}';`;
    return {
      sql,
      result: { kind: "scalar", label: "Payment count", value: String(f.length), sql },
    };
  },
  count_payments_year: (rows, s, ctx) => {
    if (s.year == null) return null;
    const { startMs: a, endExMs: b } = localYearBoundsMs(ctx.timeZone, s.year);
    const st = s.status_scope ?? "succeeded";
    const f = filterRows(rows, a, b, st);
    const sql = `SELECT COUNT(*) FROM transactions WHERE year = ${s.year} ...`;
    return {
      sql,
      result: { kind: "scalar", label: `Count (${st}) in ${s.year}`, value: String(f.length), sql },
    };
  },
  top_page_revenue_month: (rows, s, ctx) => {
    if (s.year == null || s.month == null) return null;
    const { startMs: a, endExMs: b } = localMonthBoundsMs(ctx.timeZone, s.year, s.month);
    const st = s.status_scope ?? "succeeded";
    const f = filterRows(rows, a, b, st);
    const m = new Map<string, { amt: number; n: number }>();
    for (const r of f) {
      const p = pageTitle(r);
      const c = m.get(p) ?? { amt: 0, n: 0 };
      c.amt += Number(r.amount);
      c.n += 1;
      m.set(p, c);
    }
    let best: { page: string; amt: number; n: number } | null = null;
    for (const [page, v] of m) {
      if (!best || v.amt > best.amt) best = { page, amt: v.amt, n: v.n };
    }
    const sql = `SELECT p.title, SUM(t.amount) AS revenue, COUNT(*)::int AS n
FROM transactions t
JOIN payment_pages p ON p.id = t.page_id
WHERE t.created_at >= '...' AND t.created_at < '...' AND t.status = '${st}'
GROUP BY 1
ORDER BY revenue DESC
LIMIT 1;`;
    if (!best) {
      return {
        sql,
        result: { kind: "table", columns: ["page", "revenue", "transactions"], rows: [], sql },
      };
    }
    return {
      sql,
      result: {
        kind: "table",
        columns: ["page", "revenue (USD)", "transactions"],
        rows: [[best.page, best.amt, best.n]],
        sql,
      },
    };
  },
  top_page_revenue_year: (rows, s, ctx) => {
    if (s.year == null) return null;
    const { startMs: a, endExMs: b } = localYearBoundsMs(ctx.timeZone, s.year);
    const st = s.status_scope ?? "succeeded";
    const f = filterRows(rows, a, b, st);
    const m = new Map<string, { amt: number; n: number }>();
    for (const r of f) {
      const p = pageTitle(r);
      const c = m.get(p) ?? { amt: 0, n: 0 };
      c.amt += Number(r.amount);
      c.n += 1;
      m.set(p, c);
    }
    let best: { page: string; amt: number; n: number } | null = null;
    for (const [page, v] of m) {
      if (!best || v.amt > best.amt) best = { page, amt: v.amt, n: v.n };
    }
    const sql = `... same as top_page_revenue_month but for year = ${s.year} ...`;
    if (!best) {
      return {
        sql,
        result: { kind: "table", columns: ["page", "revenue", "transactions"], rows: [], sql },
      };
    }
    return {
      sql,
      result: {
        kind: "table",
        columns: ["page", "revenue (USD)", "transactions"],
        rows: [[best.page, best.amt, best.n]],
        sql,
      },
    };
  },
  top_n_pages_revenue_month: (rows, s, ctx) => {
    if (s.year == null || s.month == null) return null;
    const lim = Math.min(50, s.limit ?? DEFAULT_LIMIT);
    const { startMs: a, endExMs: b } = localMonthBoundsMs(ctx.timeZone, s.year, s.month);
    const st = s.status_scope ?? "succeeded";
    const f = filterRows(rows, a, b, st);
    const m = new Map<string, { amt: number; n: number }>();
    for (const r of f) {
      const p = pageTitle(r);
      const c = m.get(p) ?? { amt: 0, n: 0 };
      c.amt += Number(r.amount);
      c.n += 1;
      m.set(p, c);
    }
    const sorted = [...m.entries()]
      .map(([page, v]) => [page, v.amt, v.n] as [string, number, number])
      .sort((x, y) => y[1] - x[1])
      .slice(0, lim);
    const sql = `SELECT p.title, SUM(t.amount) rev, COUNT(*) n FROM ... GROUP BY 1 ORDER BY rev DESC LIMIT ${lim};`;
    return {
      sql,
      result: {
        kind: "table",
        columns: ["page", "revenue (USD)", "tx"],
        rows: sorted.map(([p, a0, n]) => [p, a0, n]),
        sql,
      },
    };
  },
  top_n_pages_revenue_year: (rows, s, ctx) => {
    if (s.year == null) return null;
    const lim = Math.min(50, s.limit ?? DEFAULT_LIMIT);
    const { startMs: a, endExMs: b } = localYearBoundsMs(ctx.timeZone, s.year);
    const st = s.status_scope ?? "succeeded";
    const f = filterRows(rows, a, b, st);
    const m = new Map<string, { amt: number; n: number }>();
    for (const r of f) {
      const p = pageTitle(r);
      const c = m.get(p) ?? { amt: 0, n: 0 };
      c.amt += Number(r.amount);
      c.n += 1;
      m.set(p, c);
    }
    const sorted = [...m.entries()]
      .map(([page, v]) => [page, v.amt, v.n] as [string, number, number])
      .sort((x, y) => y[1] - x[1])
      .slice(0, lim);
    const sql = `SELECT ... ORDER BY rev DESC LIMIT ${lim} -- year ${s.year};`;
    return {
      sql,
      result: {
        kind: "table",
        columns: ["page", "revenue (USD)", "tx"],
        rows: sorted.map(([p, a0, n]) => [p, a0, n]),
        sql,
      },
    };
  },
  top_payment_method_revenue_month: (rows, s, ctx) => {
    if (s.year == null || s.month == null) return null;
    const { startMs: a, endExMs: b } = localMonthBoundsMs(ctx.timeZone, s.year, s.month);
    const st = s.status_scope ?? "succeeded";
    const f = filterRows(rows, a, b, st);
    const m = new Map<string, { amt: number; n: number }>();
    for (const r of f) {
      const k = (r.payment_method_type ?? "unknown").trim() || "unknown";
      const c = m.get(k) ?? { amt: 0, n: 0 };
      c.amt += Number(r.amount);
      c.n += 1;
      m.set(k, c);
    }
    let best: { k: string; amt: number; n: number } | null = null;
    for (const [k, v] of m) {
      if (!best || v.amt > best.amt) best = { k, amt: v.amt, n: v.n };
    }
    const sql = `SELECT payment_method_type, SUM(amount), COUNT(*) ... GROUP BY 1 ORDER BY 2 DESC LIMIT 1;`;
    if (!best) {
      return {
        sql,
        result: { kind: "table", columns: ["method", "revenue", "n"], rows: [], sql },
      };
    }
    return {
      sql,
      result: {
        kind: "table",
        columns: ["method", "revenue (USD)", "tx"],
        rows: [[best.k, best.amt, best.n]],
        sql,
      },
    };
  },
  top_gl_revenue_month: (rows, s, ctx) => {
    if (s.year == null || s.month == null) return null;
    const { startMs: a, endExMs: b } = localMonthBoundsMs(ctx.timeZone, s.year, s.month);
    const st = s.status_scope ?? "succeeded";
    const f = filterRows(rows, a, b, st);
    const m = new Map<string, { amt: number; n: number }>();
    for (const r of f) {
      const codes = r.gl_codes_snapshot?.length ? r.gl_codes_snapshot : ["(none)"];
      for (const g of codes) {
        const c = m.get(g) ?? { amt: 0, n: 0 };
        c.amt += Number(r.amount) / codes.length;
        c.n += 1;
        m.set(g, c);
      }
    }
    let best: { g: string; amt: number; n: number } | null = null;
    for (const [g, v] of m) {
      if (!best || v.amt > best.amt) best = { g, amt: v.amt, n: v.n };
    }
    const sql = `-- GL lines split if multiple (approximation in app)`;
    if (!best) {
      return {
        sql,
        result: { kind: "table", columns: ["gl", "revenue (alloc)", "n"], rows: [], sql },
      };
    }
    return {
      sql,
      result: {
        kind: "table",
        columns: ["gl code", "revenue (USD, split)", "tx"],
        rows: [[best.g, best.amt, best.n]],
        sql,
      },
    };
  },
  average_order_value_month: (rows, s, ctx) => {
    if (s.year == null || s.month == null) return null;
    const { startMs: a, endExMs: b } = localMonthBoundsMs(ctx.timeZone, s.year, s.month);
    const st = s.status_scope ?? "succeeded";
    const f = filterRows(rows, a, b, st);
    const n = f.length;
    const avg = n ? sumAmount(f) / n : 0;
    const sql = `SELECT AVG(amount) ...`;
    return {
      sql,
      result: { kind: "scalar", label: "Average order value", value: fmtMoney(avg), sql },
    };
  },
  min_max_transaction_month: (rows, s, ctx) => {
    if (s.year == null || s.month == null) return null;
    const { startMs: a, endExMs: b } = localMonthBoundsMs(ctx.timeZone, s.year, s.month);
    const st = s.status_scope ?? "succeeded";
    const f = filterRows(rows, a, b, st);
    if (f.length === 0) {
      const sql = `SELECT MIN(amount), MAX(amount) ...`;
      return {
        sql,
        result: { kind: "table", columns: ["min (USD)", "max (USD)"], rows: [], sql },
      };
    }
    const amounts = f.map((r) => Number(r.amount));
    const mn = Math.min(...amounts);
    const mx = Math.max(...amounts);
    const sql = `SELECT MIN(amount), MAX(amount) FROM transactions WHERE ...`;
    return {
      sql,
      result: {
        kind: "table",
        columns: ["min (USD)", "max (USD)", "n payments"],
        rows: [[mn, mx, f.length]],
        sql,
      },
    };
  },
  failed_count_and_amount_month: (rows, s, ctx) => {
    if (s.year == null || s.month == null) return null;
    const { startMs: a, endExMs: b } = localMonthBoundsMs(ctx.timeZone, s.year, s.month);
    const f = filterRows(rows, a, b, "failed");
    const tot = sumAmount(f);
    const sql = `SELECT COUNT(*), COALESCE(SUM(amount),0) FROM ... WHERE status='failed' ...`;
    return {
      sql,
      result: {
        kind: "table",
        columns: ["failed count", "failed amount (USD)"],
        rows: [[f.length, tot]],
        sql,
      },
    };
  },
  revenue_for_page_fuzzy_month: (rows, s, ctx) => {
    if (s.year == null || s.month == null || !s.page_contains?.trim()) return null;
    const needle = s.page_contains.trim().toLowerCase();
    const { startMs: a, endExMs: b } = localMonthBoundsMs(ctx.timeZone, s.year, s.month);
    const st = s.status_scope ?? "succeeded";
    const f = filterRows(rows, a, b, st).filter(
      (r) => pageTitle(r).toLowerCase().includes(needle),
    );
    const tot = sumAmount(f);
    const sql = `SELECT SUM(amount) ... AND p.title ILIKE '%${needle}%' ...`;
    return {
      sql,
      result: { kind: "scalar", label: "Revenue (matched pages)", value: fmtMoney(tot), sql },
    };
  },
  unique_payers_month: (rows, s, ctx) => {
    if (s.year == null || s.month == null) return null;
    const { startMs: a, endExMs: b } = localMonthBoundsMs(ctx.timeZone, s.year, s.month);
    const st = s.status_scope ?? "succeeded";
    const f = filterRows(rows, a, b, st);
    const set = new Set(
      f.map((r) => (r.payer_email ?? r.payer_name ?? r.id + r.created_at).toLowerCase()),
    );
    const sql = `SELECT COUNT(DISTINCT coalesce(payer_email, payer_name)) ...`;
    return {
      sql,
      result: { kind: "scalar", label: "Unique payers (best-effort)", value: String(set.size), sql },
    };
  },
  top_payer_revenue_month: (rows, s, ctx) => {
    if (s.year == null || s.month == null) return null;
    const { startMs: a, endExMs: b } = localMonthBoundsMs(ctx.timeZone, s.year, s.month);
    const st = s.status_scope ?? "succeeded";
    const f = filterRows(rows, a, b, st);
    const m = new Map<string, { amt: number; n: number; label: string }>();
    for (const r of f) {
      const k = (r.payer_email ?? r.payer_name ?? "—").toLowerCase();
      const label = r.payer_name || r.payer_email || "—";
      const c = m.get(k) ?? { amt: 0, n: 0, label };
      c.amt += Number(r.amount);
      c.n += 1;
      m.set(k, c);
    }
    let best: { label: string; amt: number; n: number } | null = null;
    for (const [, v] of m) {
      if (!best || v.amt > best.amt) best = v;
    }
    const sql = `SELECT coalesce(payer_email,payer_name), SUM(amount), COUNT(*) ... GROUP BY 1 ...`;
    if (!best) {
      return {
        sql,
        result: { kind: "table", columns: ["payer", "revenue", "tx"], rows: [], sql },
      };
    }
    return {
      sql,
      result: {
        kind: "table",
        columns: ["payer", "revenue (USD)", "tx"],
        rows: [[best.label, best.amt, best.n]],
        sql,
      },
    };
  },
  best_day_revenue_month: (rows, s, ctx) => {
    if (s.year == null || s.month == null) return null;
    const tz = ctx.timeZone;
    const { startMs: a, endExMs: b } = localMonthBoundsMs(tz, s.year, s.month);
    const st = s.status_scope ?? "succeeded";
    const f = filterRows(rows, a, b, st);
    const byDay = new Map<string, { amt: number; n: number }>();
    for (const r of f) {
      const d = localDateKey(r.created_at, tz);
      const c = byDay.get(d) ?? { amt: 0, n: 0 };
      c.amt += Number(r.amount);
      c.n += 1;
      byDay.set(d, c);
    }
    let best: { d: string; amt: number; n: number } | null = null;
    for (const [d, v] of byDay) {
      if (!best || v.amt > best.amt) best = { d, amt: v.amt, n: v.n };
    }
    const sql = `SELECT date_trunc('day', created_at AT TIME ZONE '...'), SUM(amount) ... (group by local day in ${tz})`;
    if (!best) {
      return {
        sql,
        result: { kind: "table", columns: ["day (local)", "revenue", "tx"], rows: [], sql },
      };
    }
    return {
      sql,
      result: {
        kind: "table",
        columns: ["day (local date)", "revenue (USD)", "tx"],
        rows: [[best.d, best.amt, best.n]],
        sql,
      },
    };
  },
  count_tx_page_title_month: (rows, s, ctx) => {
    if (s.year == null || s.month == null) return null;
    const { startMs: a, endExMs: b } = localMonthBoundsMs(ctx.timeZone, s.year, s.month);
    const st = s.status_scope ?? "succeeded";
    const f = filterRows(rows, a, b, st);
    if (!s.page_contains?.trim()) return null;
    const needle = s.page_contains.trim().toLowerCase();
    const c = f.filter((r) => pageTitle(r).toLowerCase().includes(needle));
    const sql = `SELECT COUNT(*) ... AND title ILIKE ...`;
    return {
      sql,
      result: { kind: "scalar", label: "Transactions (matched page)", value: String(c.length), sql },
    };
  },
  top_page_tx_count_month: (rows, s, ctx) => {
    if (s.year == null || s.month == null) return null;
    const { startMs: a, endExMs: b } = localMonthBoundsMs(ctx.timeZone, s.year, s.month);
    const st = s.status_scope ?? "succeeded";
    const f = filterRows(rows, a, b, st);
    const m = new Map<string, number>();
    for (const r of f) {
      const p = pageTitle(r);
      m.set(p, (m.get(p) ?? 0) + 1);
    }
    let best: { page: string; n: number } | null = null;
    for (const [page, n] of m) {
      if (!best || n > best.n) best = { page, n };
    }
    const sql = `SELECT p.title, COUNT(*) FROM ... GROUP BY 1 ORDER BY 2 DESC LIMIT 1;`;
    if (!best) {
      return { sql, result: { kind: "table", columns: ["page", "n"], rows: [], sql } };
    }
    return { sql, result: { kind: "table", columns: ["page", "transaction count"], rows: [[best.page, best.n]], sql } };
  },
  ytd_revenue: (rows, s, ctx) => {
    if (s.year == null) return null;
    const st = s.status_scope ?? "succeeded";
    const y = s.year;
    const tz = ctx.timeZone;
    const now = new Date();
    const localNow = localYmdInZone(tz, now);
    const { startMs: a, endExMs: yearEnd } = localYearBoundsMs(tz, y);
    const end = y === localNow.y ? now.getTime() + 1 : yearEnd;
    const f = filterRows(rows, a, end, st);
    const tot = sumAmount(f);
    const sql = `-- YTD for ${y} (${tz} local; through now if that is the current local year)`;
    return {
      sql: `${sql}\n-- ${new Date(a).toISOString()} .. ${new Date(end).toISOString()}`,
      result: { kind: "scalar", label: `YTD ${y} (${st})`, value: fmtMoney(tot), sql },
    };
  },
  prior_month_totals: (rows, s, ctx) => {
    const st = s.status_scope ?? "succeeded";
    const { startMs: a, endExMs: b } = localPreviousMonthBoundsMs(ctx.timeZone);
    const f = filterRows(rows, a, b, st);
    const tot = sumAmount(f);
    const sql = `-- Previous full local calendar month (${ctx.timeZone})`;
    return {
      sql,
      result: { kind: "scalar", label: "Total last month", value: fmtMoney(tot), sql },
    };
  },
  list_recent_failed: (rows, s, ctx) => {
    const lim = Math.min(20, s.limit ?? 10);
    const tz = ctx.timeZone;
    const f = rows
      .filter((r) => r.status === "failed")
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, lim);
    const sql = `SELECT * FROM transactions WHERE status = 'failed' ORDER BY created_at DESC LIMIT ${lim};`;
    return {
      sql,
      result: {
        kind: "table",
        columns: ["date (local)", "page", "amount", "payer email"],
        rows: f.map((r) => [
          formatInTimeZone(new Date(r.created_at), tz, "yyyy-MM-dd HH:mm"),
          pageTitle(r),
          Number(r.amount),
          r.payer_email ?? "",
        ]),
        sql,
      },
    };
  },
  total_revenue_all_loaded: (rows, _s, _ctx) => {
    const f = rows.filter((r) => r.status === "succeeded");
    const tot = sumAmount(f);
    const sql = `SELECT COALESCE(SUM(amount),0) FROM transactions WHERE status = 'succeeded';`;
    return {
      sql,
      result: {
        kind: "scalar",
        label: "Total succeeded (all rows loaded in this request)",
        value: fmtMoney(tot),
        sql,
      },
    };
  },
  count_succeeded_all_loaded: (rows, _s, _ctx) => {
    const f = rows.filter((r) => r.status === "succeeded");
    const sql = `SELECT COUNT(*) FROM transactions WHERE status = 'succeeded';`;
    return {
      sql,
      result: { kind: "scalar", label: "Succeeded count (loaded scope)", value: String(f.length), sql },
    };
  },
  total_revenue_calendar_day: (rows, s, ctx) =>
    totalRevenueCalendarDayInner(rows, s, ctx.timeZone),
  /** Succeeded purchase count + revenue in a local clock range; "today" if y/m/d omitted. */
  purchases_revenue_local_time_range: (rows, s, ctx) => {
    const tz = ctx.timeZone;
    if (s.local_hour_start == null || s.local_hour_end == null) return null;
    let y = s.year;
    let mo = s.month;
    let d = s.day;
    if (y == null || mo == null || d == null) {
      const t = localYmdInZone(tz);
      y = t.y;
      mo = t.m;
      d = t.d;
    }
    const w = localTimeRangeOnLocalDayMs(
      tz,
      y,
      mo,
      d,
      s.local_hour_start,
      s.local_minute_start ?? 0,
      s.local_hour_end,
      s.local_minute_end ?? 0,
    );
    if (w.endExMs <= w.startMs) return null;
    const f = filterRows(rows, w.startMs, w.endExMs, "succeeded");
    const n = f.length;
    const tot = sumAmount(f);
    const sql = `-- Local ${y}-${pad2(mo)}-${pad2(d)} ${tz} [${String(s.local_hour_start).padStart(2, "0")}:${String(s.local_minute_start ?? 0).padStart(2, "0")}, ${String(s.local_hour_end).padStart(2, "0")}:${String(s.local_minute_end ?? 0).padStart(2, "0")}) → UTC [${new Date(w.startMs).toISOString()}, ${new Date(w.endExMs).toISOString()})`;
    return {
      sql,
      result: {
        kind: "table",
        columns: ["succeeded purchases", "revenue (USD)"],
        rows: [[n, tot]],
        sql,
      },
    };
  },
  payment_methods_revenue_table_month: (rows, s, ctx) => {
    if (s.year == null || s.month == null) return null;
    const { startMs: a, endExMs: b } = localMonthBoundsMs(ctx.timeZone, s.year, s.month);
    const st = s.status_scope ?? "succeeded";
    const f = filterRows(rows, a, b, st);
    const m = new Map<string, { amt: number; n: number }>();
    for (const r of f) {
      const k = (r.payment_method_type ?? "unknown").trim() || "unknown";
      const c = m.get(k) ?? { amt: 0, n: 0 };
      c.amt += Number(r.amount);
      c.n += 1;
      m.set(k, c);
    }
    const rowsOut = [...m.entries()]
      .map(([k, v]) => [k, v.amt, v.n] as (string | number)[])
      .sort((a, b) => (b[1] as number) - (a[1] as number));
    const sql = `SELECT payment_method_type, SUM(amount) rev, COUNT(*) n
FROM ... WHERE month = ${s.year}-${pad2(s.month)} AND status = '${st}'
GROUP BY 1 ORDER BY rev DESC;`;
    return { sql, result: { kind: "table", columns: ["method", "revenue (USD)", "tx"], rows: rowsOut, sql } };
  },
  email_domain_succeeded_stats: (rows, s, ctx) => {
    const needle = s.email_domain_contains?.trim().toLowerCase();
    if (!needle) return null;
    const scoped = succeededInScope(rows, s, ctx);
    const totalAll = sumAmount(scoped);
    const matched = scoped.filter((r) =>
      (r.payer_email ?? "").toLowerCase().includes(needle),
    );
    const sumMatched = sumAmount(matched);
    const emails = new Set(
      matched.map((r) => (r.payer_email ?? "").toLowerCase()).filter((e) => e.length > 0),
    );
    const pct = totalAll > 0 ? (100 * sumMatched) / totalAll : 0;
    const sql = `-- Unique payer emails (non-empty), payment count, revenue, % of succeeded total in scope`;
    return {
      sql,
      result: {
        kind: "table",
        columns: [
          "unique emails (with match)",
          "succeeded payments",
          "revenue (USD)",
          "% of succeeded total in scope",
        ],
        rows: [[emails.size, matched.length, sumMatched, fmtPct(pct)]],
        sql,
      },
    };
  },
  email_substring_succeeded_stats: (rows, s, ctx) => {
    const needle = s.email_contains?.trim().toLowerCase();
    if (!needle) return null;
    const scoped = succeededInScope(rows, s, ctx);
    const totalAll = sumAmount(scoped);
    const matched = scoped.filter((r) =>
      (r.payer_email ?? "").toLowerCase().includes(needle),
    );
    const sumMatched = sumAmount(matched);
    const emails = new Set(
      matched.map((r) => (r.payer_email ?? "").toLowerCase()).filter((e) => e.length > 0),
    );
    const pct = totalAll > 0 ? (100 * sumMatched) / totalAll : 0;
    const sql = `-- email ILIKE %${needle}% on succeeded rows in scope`;
    return {
      sql,
      result: {
        kind: "table",
        columns: [
          "unique emails (with match)",
          "succeeded payments",
          "revenue (USD)",
          "% of succeeded total in scope",
        ],
        rows: [[emails.size, matched.length, sumMatched, fmtPct(pct)]],
        sql,
      },
    };
  },
  top_n_email_domains_by_revenue: (rows, s, ctx) => {
    const lim = Math.min(50, s.limit ?? DEFAULT_LIMIT);
    const scoped = succeededInScope(rows, s, ctx);
    const byDom = new Map<string, { amt: number; n: number; uniq: Set<string> }>();
    for (const r of scoped) {
      const dom = emailDomainPart(r.payer_email);
      if (!dom) continue;
      const cur = byDom.get(dom) ?? { amt: 0, n: 0, uniq: new Set<string>() };
      cur.amt += Number(r.amount);
      cur.n += 1;
      if (r.payer_email) cur.uniq.add(r.payer_email.toLowerCase());
      byDom.set(dom, cur);
    }
    const sorted = [...byDom.entries()]
      .map(([dom, v]) => [dom, v.amt, v.n, v.uniq.size] as [string, number, number, number])
      .sort((a, b) => b[1] - a[1])
      .slice(0, lim);
    const sql = `GROUP BY split_part(payer_email,'@',2) ORDER BY sum(amount) DESC LIMIT ${lim}`;
    return {
      sql,
      result: {
        kind: "table",
        columns: ["email domain", "revenue (USD)", "payments", "unique emails"],
        rows: sorted.map((x) => [x[0], x[1], x[2], x[3]]),
        sql,
      },
    };
  },
  largest_succeeded_payment_month: (rows, s, ctx) => {
    if (s.year == null || s.month == null) return null;
    const { startMs: a, endExMs: b } = localMonthBoundsMs(ctx.timeZone, s.year, s.month);
    const f = filterRows(rows, a, b, "succeeded");
    if (f.length === 0) {
      return {
        sql: "SELECT max(amount) ...",
        result: {
          kind: "table",
          columns: ["largest (USD)", "page", "payer email", "at (UTC)"],
          rows: [],
          sql: "SELECT max(amount) ...",
        },
      };
    }
    const amounts = f.map((r) => ({ r, n: Number(r.amount) }));
    const best = amounts.reduce((p, c) => (c.n > p.n ? c : p), amounts[0]!);
    const br = best.r;
    const sql = `SELECT max(amount) ... WHERE local month + succeeded`;
    return {
      sql,
      result: {
        kind: "table",
        columns: ["largest (USD)", "page", "payer email", "at (UTC)"],
        rows: [
          [best.n, pageTitle(br), br.payer_email ?? "—", br.created_at.slice(0, 19)],
        ],
        sql,
      },
    };
  },
  status_breakdown_local_month: (rows, s, ctx) => {
    if (s.year == null || s.month == null) return null;
    const { startMs: a, endExMs: b } = localMonthBoundsMs(ctx.timeZone, s.year, s.month);
    const f = rows.filter((r) => inRange(r.created_at, a, b));
    const m = { succeeded: 0, failed: 0, pending: 0, all: f.length } as {
      succeeded: number;
      failed: number;
      pending: number;
      all: number;
    };
    for (const r of f) {
      if (r.status === "succeeded") m.succeeded += 1;
      else if (r.status === "failed") m.failed += 1;
      else if (r.status === "pending") m.pending += 1;
    }
    const sql = `SELECT status, COUNT(*) ... GROUP BY 1 in local month`;
    return {
      sql,
      result: {
        kind: "table",
        columns: ["succeeded", "failed", "pending", "total"],
        rows: [[m.succeeded, m.failed, m.pending, m.all]],
        sql,
      },
    };
  },
  month_over_month_succeeded_revenue: (rows, s, ctx) => {
    if (s.year == null || s.month == null) return null;
    const y = s.year;
    const m0 = s.month;
    const cur = localMonthBoundsMs(ctx.timeZone, y, m0);
    let py = y;
    let pm = m0 - 1;
    if (pm < 1) {
      pm = 12;
      py -= 1;
    }
    const prev = localMonthBoundsMs(ctx.timeZone, py, pm);
    const curF = filterRows(rows, cur.startMs, cur.endExMs, "succeeded");
    const prevF = filterRows(rows, prev.startMs, prev.endExMs, "succeeded");
    const curSum = sumAmount(curF);
    const prevSum = sumAmount(prevF);
    const chg = prevSum > 0 ? ((100 * (curSum - prevSum)) / prevSum) : null;
    const sql = `-- Compare two consecutive local months`;
    return {
      sql,
      result: {
        kind: "table",
        columns: [
          "previous month revenue (USD)",
          "this month revenue (USD)",
          "% change vs previous",
        ],
        rows: [[prevSum, curSum, chg == null ? "—" : fmtPct(chg)]],
        sql,
      },
    };
  },
  repeat_payer_emails_month: (rows, s, ctx) => {
    if (s.year == null || s.month == null) return null;
    const { startMs: a, endExMs: b } = localMonthBoundsMs(ctx.timeZone, s.year, s.month);
    const f = filterRows(rows, a, b, "succeeded");
    const byEmail = new Map<string, number>();
    for (const r of f) {
      const e = (r.payer_email ?? "").toLowerCase();
      if (!e) continue;
      byEmail.set(e, (byEmail.get(e) ?? 0) + 1);
    }
    const repeat = [...byEmail.values()].filter((n) => n >= 2).length;
    const sql = `COUNT email HAVING count >= 2 in month`;
    return {
      sql,
      result: {
        kind: "table",
        columns: [
          "payer emails with 2+ payments",
          "total succeeded payments in month",
        ],
        rows: [[repeat, f.length]],
        sql,
      },
    };
  },
  median_succeeded_payment_month: (rows, s, ctx) => {
    if (s.year == null || s.month == null) return null;
    const { startMs: a, endExMs: b } = localMonthBoundsMs(ctx.timeZone, s.year, s.month);
    const f = filterRows(rows, a, b, "succeeded");
    if (f.length === 0) {
      return {
        sql: "percentile_cont(0.5)",
        result: { kind: "scalar", label: "Median (succeeded, USD)", value: "—", sql: "" },
      };
    }
    const nums = f.map((r) => Number(r.amount)).sort((x, y) => x - y);
    const mid = Math.floor(nums.length / 2);
    const med =
      nums.length % 2 === 0 ? (nums[mid - 1]! + nums[mid]!) / 2 : nums[mid]!;
    const sql = `SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY amount)`;
    return {
      sql,
      result: { kind: "scalar", label: "Median (succeeded, USD)", value: fmtMoney(med), sql },
    };
  },
  revenue_by_local_weekday_month: (rows, s, ctx) => {
    if (s.year == null || s.month == null) return null;
    const tz = ctx.timeZone;
    const { startMs: a, endExMs: b } = localMonthBoundsMs(tz, s.year, s.month);
    const f = filterRows(rows, a, b, "succeeded");
    const m = new Map<string, { amt: number; n: number }>();
    for (const r of f) {
      const wd = formatInTimeZone(new Date(r.created_at), tz, "EEEE");
      const c = m.get(wd) ?? { amt: 0, n: 0 };
      c.amt += Number(r.amount);
      c.n += 1;
      m.set(wd, c);
    }
    const order = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const rowsOut = order.map((d) => {
      const v = m.get(d);
      return [d, v?.amt ?? 0, v?.n ?? 0] as (string | number)[];
    });
    const sqlW = `GROUP BY local weekday in ${tz}`;
    return {
      sql: sqlW,
      result: { kind: "table", columns: ["weekday", "revenue (USD)", "count"], rows: rowsOut, sql: sqlW },
    };
  },
  payer_name_substring_succeeded_stats: (rows, s, ctx) => {
    const needle = s.payer_name_contains?.trim().toLowerCase();
    if (!needle) return null;
    const scoped = succeededInScope(rows, s, ctx);
    const totalAll = sumAmount(scoped);
    const matched = scoped.filter((r) =>
      (r.payer_name ?? "").toLowerCase().includes(needle),
    );
    const sumMatched = sumAmount(matched);
    const names = new Set(
      matched.map((r) => (r.payer_name ?? "").toLowerCase()).filter((n) => n.length > 0),
    );
    const pct = totalAll > 0 ? (100 * sumMatched) / totalAll : 0;
    const sql = `-- payer_name ILIKE %${needle}% on succeeded in scope`;
    return {
      sql,
      result: {
        kind: "table",
        columns: [
          "unique names (with match)",
          "succeeded payments",
          "revenue (USD)",
          "% of succeeded total in scope",
        ],
        rows: [[names.size, matched.length, sumMatched, fmtPct(pct)]],
        sql,
      },
    };
  },
  total_revenue_today_utc: (rows, s, ctx) => {
    const tz = ctx.timeZone;
    const { y, m, d } = localYmdInZone(tz);
    const st = s.status_scope ?? "succeeded";
    const start = localCalendarDayWindowMs(tz, y, m, d, "full").startMs;
    const end = Date.now() + 1;
    const f = filterRows(rows, start, end, st);
    const tot = sumAmount(f);
    const sql = `-- So far today (${tz} local calendar day) through "now"`;
    return {
      sql,
      result: {
        kind: "scalar",
        label: "Succeeded total so far today (your local calendar day)",
        value: fmtMoney(tot),
        sql,
      },
    };
  },
};

export const REPORT_ASK_TEMPLATE_IDS = Object.keys(T) as (keyof typeof T)[];

export const REPORT_ASK_CATALOG: {
  id: keyof typeof T;
  title: string;
  sqlTemplate: string;
}[] = [
  { id: "total_revenue_month", title: "Total revenue in a calendar month", sqlTemplate: "SUM(amount) WHERE year/month + status" },
  { id: "total_revenue_year", title: "Total revenue in a calendar year", sqlTemplate: "SUM(amount) WHERE year + status" },
  { id: "total_revenue_quarter", title: "Total revenue in a calendar quarter (Q1–Q4)", sqlTemplate: "SUM(amount) WHERE quarter + status" },
  { id: "total_revenue_last_n_days", title: "Total revenue in the last N days", sqlTemplate: "SUM(amount) in rolling window" },
  { id: "count_payments_month", title: "Count of payments in a month", sqlTemplate: "COUNT(*) by month + status" },
  { id: "count_payments_year", title: "Count of payments in a year", sqlTemplate: "COUNT(*) by year" },
  { id: "top_page_revenue_month", title: "Single page with highest revenue in a month", sqlTemplate: "GROUP BY page ORDER BY sum DESC LIMIT 1" },
  { id: "top_page_revenue_year", title: "Single page with highest revenue in a year", sqlTemplate: "GROUP BY page ORDER BY sum DESC LIMIT 1" },
  { id: "top_n_pages_revenue_month", title: "Top N pages by revenue in a month", sqlTemplate: "GROUP BY page ORDER BY sum DESC LIMIT N" },
  { id: "top_n_pages_revenue_year", title: "Top N pages by revenue in a year", sqlTemplate: "GROUP BY page ORDER BY sum DESC LIMIT N" },
  { id: "top_payment_method_revenue_month", title: "Payment method with highest revenue in a month", sqlTemplate: "GROUP BY method ORDER BY sum DESC LIMIT 1" },
  { id: "top_gl_revenue_month", title: "GL code with highest revenue in a month (split if multiple)", sqlTemplate: "GROUP BY gl" },
  { id: "average_order_value_month", title: "Average order value in a month", sqlTemplate: "AVG(amount)" },
  { id: "min_max_transaction_month", title: "Min and max successful payment in a month", sqlTemplate: "MIN/MAX(amount)" },
  { id: "failed_count_and_amount_month", title: "Failed payment count and sum in a month", sqlTemplate: "COUNT/SUM for failed" },
  { id: "revenue_for_page_fuzzy_month", title: "Revenue for pages whose title contains text (month)", sqlTemplate: "SUM + ILIKE" },
  { id: "unique_payers_month", title: "Approximate unique payers in a month", sqlTemplate: "COUNT DISTINCT" },
  { id: "top_payer_revenue_month", title: "Payer with highest total spend in a month", sqlTemplate: "GROUP BY email/name" },
  { id: "best_day_revenue_month", title: "Local calendar day with highest revenue in a month", sqlTemplate: "GROUP BY day" },
  { id: "count_tx_page_title_month", title: "Transaction count for pages matching a title fragment (month)", sqlTemplate: "COUNT + filter" },
  { id: "top_page_tx_count_month", title: "Page with the most successful transactions in a month", sqlTemplate: "ORDER BY count" },
  { id: "ytd_revenue", title: "Year-to-date revenue (through today if current year)", sqlTemplate: "SUM YTD" },
  { id: "prior_month_totals", title: "Total revenue in the previous full calendar month", sqlTemplate: "SUM last month" },
  { id: "list_recent_failed", title: "Recent failed payments (diagnostic list)", sqlTemplate: "SELECT ... failed ORDER BY time" },
  { id: "total_revenue_all_loaded", title: "Total succeeded revenue in all rows loaded in this request", sqlTemplate: "SUM without date filter" },
  { id: "count_succeeded_all_loaded", title: "Count of succeeded payments in all loaded rows", sqlTemplate: "COUNT succeeded" },
  { id: "total_revenue_calendar_day", title: "Total revenue on one local calendar day (optional end time e.g. before 1pm)", sqlTemplate: "SUM in local TZ window" },
  { id: "purchases_revenue_local_time_range", title: "Count and revenue for a local time-of-day window (e.g. 1-3pm today); walls convert to UTC for DB", sqlTemplate: "COUNT+SUM in [t1,t2) local" },
  { id: "payment_methods_revenue_table_month", title: "Breakdown: revenue and count by payment method in a month", sqlTemplate: "GROUP BY method" },
  { id: "total_revenue_today_utc", title: "Total revenue so far on the current local calendar day", sqlTemplate: "SUM from local midnight to now" },
  { id: "email_domain_succeeded_stats", title: "Count, revenue, % of total for payer emails matching a domain (e.g. gatech.edu)", sqlTemplate: "FILTER email; metrics vs all succeeded in scope" },
  { id: "email_substring_succeeded_stats", title: "Same as domain stats but substring anywhere in email", sqlTemplate: "ILIKE %x% on succeeded in scope" },
  { id: "top_n_email_domains_by_revenue", title: "Top N email domains by succeeded revenue (optional month)", sqlTemplate: "GROUP BY split domain" },
  { id: "largest_succeeded_payment_month", title: "Largest single succeeded charge in a local month", sqlTemplate: "MAX(amount)" },
  { id: "status_breakdown_local_month", title: "Count of payments by status in a local month", sqlTemplate: "GROUP BY status" },
  { id: "month_over_month_succeeded_revenue", title: "Succeeded revenue this local month vs prior month", sqlTemplate: "two month sums + % change" },
  { id: "repeat_payer_emails_month", title: "How many payer emails had 2+ succeeded payments in a month", sqlTemplate: "HAVING count>=2" },
  { id: "median_succeeded_payment_month", title: "Median succeeded amount in a local month", sqlTemplate: "percentile 0.5" },
  { id: "revenue_by_local_weekday_month", title: "Succeeded revenue and count by local weekday in a month", sqlTemplate: "GROUP BY weekday in TZ" },
  { id: "payer_name_substring_succeeded_stats", title: "Stats for payers whose name contains text (like email stats)", sqlTemplate: "FILTER name; % of total" },
];

export function runReportAskTemplate(
  id: string,
  rows: ReportTx[],
  slots: ReportAskSlots,
  context: ReportAskRunContext = { timeZone: "UTC" },
): { sql: string; result: SqlPreviewRow } | null {
  const fn = T[id];
  if (!fn) return null;
  return fn(rows, slots, context);
}
