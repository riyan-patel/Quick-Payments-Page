import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type { ReportAskSlots, SqlPreviewRow } from "@/lib/reports-ask-templates";
import { localYmdInZone } from "@/lib/tz-bounds";

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function localYmdLabel(y: number, m: number, d: number, timeZone: string): string {
  const inst = fromZonedTime(new Date(y, m - 1, d, 0, 0, 0, 0), timeZone);
  return formatInTimeZone(inst, timeZone, "MMMM d, yyyy");
}

function localClockLabel(
  y: number,
  mo: number,
  d: number,
  hour: number,
  minute: number,
  timeZone: string,
): string {
  const inst = fromZonedTime(new Date(y, mo - 1, d, hour, minute, 0, 0), timeZone);
  return formatInTimeZone(inst, timeZone, "h:mm a");
}

function tableToText(columns: string[], rows: (string | number)[][]): string {
  if (rows.length === 0) return "No matching rows in your data for that period.";
  const max = 20;
  const slice = rows.length > max ? rows.slice(0, max) : rows;
  const lines = slice.map((row, i) => {
    const parts = row.map((cell, j) => {
      const h = columns[j] ?? `col${j}`;
      if (typeof cell === "number" && /revenue|amount|\(usd\)/i.test(h) && !/count|tx$|^n$/i.test(h)) {
        return `${h}: ${money(cell)}`;
      }
      return `${h}: ${String(cell)}`;
    });
    return rows.length > 1 ? `${i + 1}. ${parts.join(" · ")}` : parts.join(" · ");
  });
  const extra =
    rows.length > max
      ? `\n... and ${(rows.length - max).toLocaleString()} more row(s) not shown.`
      : "";
  return lines.join("\n") + extra;
}

export function buildStructuredNarration(
  templateId: string,
  slots: ReportAskSlots,
  result: SqlPreviewRow,
  timeZone: string,
): string {
  if (result.kind === "scalar") {
    if (templateId === "total_revenue_today_utc") {
      return `Succeeded payment total so far today in your local time (${timeZone}) is ${result.value}.`;
    }
    if (templateId === "total_revenue_calendar_day" && slots.year && slots.month && slots.day) {
      const { year: y, month: mo, day: d } = slots;
      const dayStr = localYmdLabel(y, mo, d, timeZone);
      const hasStart =
        slots.local_hour_start != null && slots.local_hour_start >= 0 && slots.local_hour_start <= 23;
      const hasEnd =
        slots.local_hour_end != null && slots.local_hour_end >= 0 && slots.local_hour_end <= 23;
      if (hasStart && hasEnd) {
        const t0 = localClockLabel(
          y,
          mo,
          d,
          slots.local_hour_start!,
          slots.local_minute_start ?? 0,
          timeZone,
        );
        const t1 = localClockLabel(
          y,
          mo,
          d,
          slots.local_hour_end!,
          slots.local_minute_end ?? 0,
          timeZone,
        );
        return `Succeeded payment total on ${dayStr} between ${t0} and ${t1} local time (end exclusive, ${timeZone}) was ${result.value}.`;
      }
      if (hasEnd) {
        const endStr = localClockLabel(
          y,
          mo,
          d,
          slots.local_hour_end!,
          slots.local_minute_end ?? 0,
          timeZone,
        );
        return `Succeeded payment total on ${dayStr} from local midnight through before ${endStr} (${timeZone}) was ${result.value}.`;
      }
      return `Succeeded payment total on ${dayStr} (${timeZone}) was ${result.value}.`;
    }
    if (templateId === "succeeded_revenue_local_datetime_range") {
      const a = {
        y: slots.range_start_year!,
        m: slots.range_start_month!,
        d: slots.range_start_day!,
      };
      const b = {
        y: slots.range_end_year!,
        m: slots.range_end_month!,
        d: slots.range_end_day!,
      };
      const startStr = localYmdLabel(a.y, a.m, a.d, timeZone);
      const endYmd = localYmdLabel(b.y, b.m, b.d, timeZone);
      if (
        slots.range_end_local_hour != null &&
        slots.range_end_local_hour >= 0 &&
        slots.range_end_local_hour <= 23
      ) {
        const endClock = localClockLabel(
          b.y,
          b.m,
          b.d,
          slots.range_end_local_hour,
          slots.range_end_local_minute ?? 0,
          timeZone,
        );
        return `Succeeded payment total from local midnight on ${startStr} through before ${endClock} on ${endYmd} (${timeZone}) was ${result.value}.`;
      }
      return `Succeeded payment total from local midnight on ${startStr} through the end of ${endYmd} (${timeZone}) was ${result.value}.`;
    }
    if (templateId === "ytd_revenue" && slots.year) {
      return `Year-to-date succeeded total for ${slots.year} in your local calendar (${timeZone}, through now if that is the current year) is ${result.value}.`;
    }
    if (templateId === "prior_month_totals") {
      return `Succeeded total for the last full calendar month in your local time (${timeZone}) was ${result.value}.`;
    }
    return `${result.label}: ${result.value}`;
  }

  const firstRow = result.kind === "table" ? result.rows[0] : undefined;
  if (result.kind === "table" && templateId === "top_page_revenue_month") {
    const monthName =
      slots.month != null && slots.year != null
        ? formatInTimeZone(
            fromZonedTime(new Date(slots.year, slots.month - 1, 1, 0, 0, 0, 0), timeZone),
            timeZone,
            "MMMM yyyy",
          )
        : "that period";
    if (result.rows.length === 0 || !firstRow) {
      return `No matching succeeded payments in ${monthName} (${timeZone}) in your data.`;
    }
    const [page, rev, n] = firstRow;
    return `For ${monthName}, the page with the highest succeeded revenue is "${String(page)}", with ${money(Number(rev))} across ${String(n)} payment(s).`;
  }
  if (result.kind === "table" && templateId === "top_page_revenue_year") {
    if (result.rows.length === 0 || !firstRow) {
      return `No matching succeeded payments in ${slots.year ?? "that year"} in your data.`;
    }
    const [page, rev, n] = firstRow;
    return `In ${slots.year}, the top page by succeeded revenue is "${String(page)}", with ${money(Number(rev))} from ${String(n)} payment(s).`;
  }
  if (result.kind === "table" && (templateId === "top_n_pages_revenue_month" || templateId === "top_n_pages_revenue_year")) {
    if (result.rows.length === 0) {
      return "No successful payments in that period in your data.";
    }
    return `Top pages by succeeded revenue:\n${tableToText(result.columns, result.rows)}`;
  }
  if (result.kind === "table" && templateId === "list_recent_failed") {
    if (result.rows.length === 0) {
      return "No failed payments in the loaded data.";
    }
    return `Recent failed payments:\n${tableToText(result.columns, result.rows)}`;
  }
  if (result.kind === "table" && templateId === "purchases_revenue_local_time_range") {
    const row = result.rows[0];
    if (!row) return "No data.";
    const n = row[0];
    const rev = row[1];
    const y0 = slots.year;
    const m0 = slots.month;
    const d0 = slots.day;
    const t: { y: number; m: number; d: number } =
      y0 != null && m0 != null && d0 != null
        ? { y: y0, m: m0, d: d0 }
        : localYmdInZone(timeZone);
    const hasYmd = y0 != null && m0 != null && d0 != null;
    const dayStr = hasYmd
      ? localYmdLabel(t.y, t.m, t.d, timeZone)
      : `today (${localYmdLabel(t.y, t.m, t.d, timeZone)}, ${timeZone})`;
    const t0 = localClockLabel(
      t.y,
      t.m,
      t.d,
      slots.local_hour_start ?? 0,
      slots.local_minute_start ?? 0,
      timeZone,
    );
    const t1 = localClockLabel(
      t.y,
      t.m,
      t.d,
      slots.local_hour_end ?? 0,
      slots.local_minute_end ?? 0,
      timeZone,
    );
    return `Between ${t0} and ${t1} local time on ${dayStr}: ${String(n)} succeeded purchase(s) with total revenue of ${typeof rev === "number" ? money(rev) : String(rev)}.`;
  }
  if (
    result.kind === "table" &&
    (templateId === "email_domain_succeeded_stats" ||
      templateId === "email_substring_succeeded_stats" ||
      templateId === "payer_name_substring_succeeded_stats")
  ) {
    const row = result.rows[0];
    if (!row || result.rows.length === 0) {
      return "No matching data in the loaded scope.";
    }
    const [uniq, payN, rev, pct] = row;
    let who = "email (substring match)";
    if (templateId === "payer_name_substring_succeeded_stats") who = "payer name";
    else if (templateId === "email_domain_succeeded_stats") who = "email (domain match)";
    return `For succeeded payments in this scope, ${String(uniq)} unique ${who}(s) made ${String(payN)} payment(s) totaling ${typeof rev === "number" ? money(rev) : String(rev)}, which is ${String(pct)} of all succeeded revenue in the same scope.`;
  }
  if (result.kind === "table" && templateId === "top_n_email_domains_by_revenue") {
    if (result.rows.length === 0) return "No succeeded payments with a recognizable email domain in the loaded scope.";
    return `Top email domains by succeeded revenue:\n${tableToText(result.columns, result.rows)}`;
  }
  if (result.kind === "table" && templateId === "largest_succeeded_payment_month") {
    if (result.rows.length === 0) return "No succeeded payments in that month.";
    const [mx, page, em, t] = result.rows[0]!;
    return `Largest succeeded payment in that month: ${typeof mx === "number" ? money(Number(mx)) : String(mx)} on page "${String(page)}" for ${String(em)} (recorded at ${String(t)} UTC in the data).`;
  }
  if (result.kind === "table" && templateId === "status_breakdown_local_month") {
    const r = result.rows[0];
    if (!r) return "No data.";
    return `In that local month: ${String(r[0])} succeeded, ${String(r[1])} failed, ${String(r[2])} pending, ${String(r[3])} total payments.`;
  }
  if (result.kind === "table" && templateId === "month_over_month_succeeded_revenue") {
    const r = result.rows[0];
    if (!r) return "No data.";
    return `Previous local month succeeded total: ${typeof r[0] === "number" ? money(Number(r[0])) : String(r[0])}. This local month: ${typeof r[1] === "number" ? money(Number(r[1])) : String(r[1])}. Change vs previous month: ${String(r[2])}.`;
  }
  if (result.kind === "table" && templateId === "repeat_payer_emails_month") {
    const r = result.rows[0];
    if (!r) return "No data.";
    return `Payer email addresses with 2+ succeeded payments in that month: ${String(r[0])}. Total succeeded payments in the month: ${String(r[1])}.`;
  }
  if (result.kind === "table" && templateId === "revenue_by_local_weekday_month") {
    return `Succeeded revenue by local weekday in your time zone (${timeZone}):\n${tableToText(result.columns, result.rows)}`;
  }
  if (result.kind === "table") {
    return tableToText(result.columns, result.rows);
  }

  return "No data.";
}
