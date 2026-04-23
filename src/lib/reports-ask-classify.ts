import { z } from "zod";
import { REPORT_ASK_CATALOG, type ReportAskSlots } from "@/lib/reports-ask-templates";

const outSchema = z.object({
  templateId: z.string().nullable(),
  confidence: z.number().min(0).max(1).optional(),
  slots: z
    .object({
      year: z.number().optional(),
      month: z.number().min(1).max(12).optional(),
      day: z.number().min(1).max(31).optional(),
      quarter: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
      last_days: z.number().min(1).max(3650).optional(),
      limit: z.number().min(1).max(50).optional(),
      page_contains: z.string().optional(),
      payer_contains: z.string().optional(),
      status_scope: z.enum(["succeeded", "failed", "pending", "all"]).optional(),
      local_hour_start: z.number().min(0).max(23).optional(),
      local_minute_start: z.number().min(0).max(59).optional(),
      local_hour_end: z.number().min(0).max(23).optional(),
      local_minute_end: z.number().min(0).max(59).optional(),
      email_domain_contains: z.string().optional(),
      email_contains: z.string().optional(),
      payer_name_contains: z.string().optional(),
    })
    .optional(),
});

const ALLOWED = new Set(REPORT_ASK_CATALOG.map((c) => c.id));

const MONTH_ALIASES: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

/** Pull month/year (and sometimes day) from the question in English. */
function heuristicFromQuestion(q: string): Partial<ReportAskSlots> {
  const t: Partial<ReportAskSlots> = {};
  const lower = q.toLowerCase();

  const y = lower.match(/\b(20[2-3][0-9])\b/);
  if (y) t.year = Number(y[1]);

  const qMatch = lower.match(/\bq([1-4])\b/);
  if (qMatch) t.quarter = Number(qMatch[1]) as 1 | 2 | 3 | 4;

  for (const [name, num] of Object.entries(MONTH_ALIASES)) {
    if (lower.includes(name)) {
      t.month = num;
      break;
    }
  }

  const dayMatch = lower.match(
    /\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(20[2-3][0-9])\b/,
  );
  if (dayMatch) {
    const mon = MONTH_ALIASES[dayMatch[1] as keyof typeof MONTH_ALIASES];
    if (mon) t.month = mon;
    t.day = Math.min(31, Math.max(1, Number(dayMatch[2])));
    t.year = Number(dayMatch[3]);
  }

  const lastDays = lower.match(/\b(?:last|past)\s+(\d{1,3})\s+days?\b/);
  if (lastDays) t.last_days = Math.min(3650, Math.max(1, Number(lastDays[1])));

  const topN = lower.match(/\btop\s+(\d{1,2})\b/);
  if (topN) t.limit = Math.min(50, Math.max(1, Number(topN[1])));

  if (lower.includes("failed") && !lower.includes("succeeded") && /fail|declin|not go through|didn\x27t go through/.test(lower)) {
    t.status_scope = "failed";
  } else if (lower.includes("pending")) {
    t.status_scope = "pending";
  } else if (lower.includes("all status") || lower.includes("every status") || lower.includes("all payments")) {
    t.status_scope = "all";
  }

  if (/\bbefore\s+1\s*p\.?m\.?\b/.test(lower) || /\bbefore\s+13:00\b/.test(lower)) {
    t.local_hour_end = 13;
    t.local_minute_end = 0;
  } else if (/\bbefore\s+noon\b/.test(lower) || /\bbefore\s+12\s*p\.?m\.?\b/.test(lower)) {
    t.local_hour_end = 12;
    t.local_minute_end = 0;
  }

  if (/\b1\s*[-–]\s*3\s*p\.?m\.?\b/.test(lower) || /\b(between|from)\s+1(\s*pm)?\s+(-|and|to|–)\s*3\s*p\.?m\.?\b/.test(lower)) {
    t.local_hour_start = 13;
    t.local_minute_start = 0;
    t.local_hour_end = 15;
    t.local_minute_end = 0;
  }

  const monthDay = lower.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?/,
  );
  if (monthDay) {
    const mon = MONTH_ALIASES[monthDay[1] as keyof typeof MONTH_ALIASES];
    if (mon) t.month = mon;
    t.day = Math.min(31, Math.max(1, Number(monthDay[2])));
  }

  if (/georgia\s*tech|gatech|@gatech\b/.test(lower)) {
    t.email_domain_contains = "gatech.edu";
  }
  const domFromText = lower.match(
    /(?:@|emails? (?:at|from|on) )([a-z0-9.-]+\.(?:edu|com|org|net|io))\b/,
  );
  if (domFromText?.[1] && !t.email_domain_contains) {
    t.email_domain_contains = domFromText[1].toLowerCase();
  }

  return t;
}

function mergeSlots(
  a: ReportAskSlots | undefined,
  b: ReportAskSlots | undefined,
): ReportAskSlots {
  return { ...a, ...b };
}

export type ClassifyResult = {
  templateId: string;
  confidence: number;
  slots: ReportAskSlots;
};

const MIN_CONFIDENCE = 0.55;

const catalogLines = REPORT_ASK_CATALOG.map(
  (c) => `- ${c.id}: ${c.title} (${c.sqlTemplate})`,
).join("\n");

function parseOpenAiJson(content: string): z.infer<typeof outSchema> {
  const raw = JSON.parse(content) as unknown;
  return outSchema.parse(raw);
}

export async function classifyReportQuestion(
  apiKey: string,
  model: string,
  question: string,
  userTimeZone: string,
): Promise<ClassifyResult | null> {
  const now = new Date();
  const utcLabel = now.toISOString().slice(0, 10);
  const heur = heuristicFromQuestion(question);
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You map business-owner questions about payment reports to one structured query template (or null).

Output JSON only with keys: templateId (string or null), confidence (0 to 1), slots (object).

If the question is vague, chit-chat, or needs raw row inspection not covered by a template, set templateId to null and confidence 0.

Rules:
- The user\'s IANA time zone (for all calendar / clock math) is: ${userTimeZone}. Months, years, "today", "last month", and "before 1pm" are in THIS zone. Database timestamps are UTC; do not set slots in UTC.
- "Revenue", "earnings", "brought in", "money" for totals usually means status_scope "succeeded" (omit or set succeeded). Failed-only questions use "failed".
- "Which page" + "most revenue" in a time window → top_page_revenue_month or top_page_revenue_year depending on month vs year in the text.
- "Top 5 pages" in April 2026 → top_n_pages_revenue_month with month 4, year 2026, limit 5.
- "Q2 2026" / "second quarter" → total_revenue_quarter or top templates with quarter: 2, year: 2026.
- "Last 7 days" / "past 30 days" → total_revenue_last_n_days and last_days.
- "YTD" / "year to date" for a year (default current local calendar year in the user time zone) → ytd_revenue with that year in slots.
- "Last month" (previous local calendar month) → prior_month_totals (no required slots; ignore month/year in slots).
- "Total ever" / "all time" on loaded data → total_revenue_all_loaded.
- "How many successful payments" (no period) on loaded data → count_succeeded_all_loaded.
- "How much on April 23 2026" / single calendar day in local time → total_revenue_calendar_day with year, month, day.
- "Before 1pm" / "before noon" on that day (no start hour) → total_revenue_calendar_day with the same date plus local_hour_end 13 (1pm) or 12 (noon) and local_minute_end 0, and do NOT set local_hour_start. Window is local midnight to that clock time, exclusive.
- "Between 1 and 3pm" / "1-3pm" (a range, not only an end) on a day → purchases_revenue_local_time_range: set local_hour_start 13, local_minute_start 0, local_hour_end 15, local_minute_end 0. Use today in the user time zone if the question says "today" and does not name a date (omit year/month/day). That template returns purchase count and revenue; bounds are [13:00, 15:00) local, converted to UTC for filtering. Prefer this over a free-form answer.
- "Today" for revenue (so far) → total_revenue_today_utc.
- "Show failed" / "recent failures" as a list → list_recent_failed.
- Use page_contains when the user names a page (substring match).
- "How many @gatech.edu / Georgia Tech / emails from a school domain made a payment, how much, what percent of total?" → email_domain_succeeded_stats with email_domain_contains (e.g. gatech.edu). Same scope rules: with month+year in the question, scope to that local month; otherwise all succeeded rows in the loaded data.
- "Emails containing X" (not just domain) → email_substring_succeeded_stats and email_contains.
- "Top email domains" / "which domains pay most" → top_n_email_domains_by_revenue.
- "Largest single payment in April" → largest_succeeded_payment_month.
- "How many succeeded / failed / pending in May" (counts by status) → status_breakdown_local_month.
- "Compared to last month" / "month over month" for a given month → month_over_month_succeeded_revenue (slots: that month; compares it to the prior calendar month).
- "How many people paid twice" / repeat payers in a month → repeat_payer_emails_month.
- "Median order size" in a month → median_succeeded_payment_month.
- "Which weekday gets the most" → revenue_by_local_weekday_month.
- "Customers named / payer name like X" → payer_name_substring_succeeded_stats and payer_name_contains.

Available templates (pick exactly one id or null):
${catalogLines}

Heuristic pre-parse (merge into slots; you may override if wrong for this question):
${JSON.stringify(heur)}

"Today" starts at local midnight in ${userTimeZone}. UTC now: ${utcLabel}.`,
        },
        { role: "user", content: question },
      ],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI ${res.status}: ${t.slice(0, 400)}`);
  }
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = body.choices?.[0]?.message?.content?.trim();
  if (!text) return null;
  let parsed: z.infer<typeof outSchema>;
  try {
    parsed = parseOpenAiJson(text);
  } catch {
    return null;
  }
  if (!parsed.templateId || (parsed.confidence ?? 0) < MIN_CONFIDENCE) {
    return null;
  }
  if (!ALLOWED.has(parsed.templateId)) {
    return null;
  }
  const slots = mergeSlots(heur, parsed.slots ?? {}) as ReportAskSlots;
  return {
    templateId: parsed.templateId,
    confidence: Math.min(1, Math.max(0, parsed.confidence ?? 0.7)),
    slots,
  };
}

export { heuristicFromQuestion, MIN_CONFIDENCE };
