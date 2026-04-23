import { NextResponse } from "next/server";
import { z } from "zod";
import { classifyReportQuestion } from "@/lib/reports-ask-classify";
import { buildAskPayloadFromRows, type ReportTx } from "@/lib/reports-ask-payload";
import { buildStructuredNarration } from "@/lib/reports-ask-structured-answer";
import { runReportAskTemplate } from "@/lib/reports-ask-templates";
import { createClient } from "@/lib/supabase/server";
import { normalizeTimeZone } from "@/lib/tz-bounds";
import type { TransactionRow } from "@/types/qpp";

const bodySchema = z.object({
  question: z.string().min(3).max(2000),
  timeZone: z.string().min(1).max(120).optional(),
});

const ANSWER_SYSTEM = `You are a payment report assistant. The business owner (the app user) asks a question in plain language.

You are given a JSON object with:
- "transactions": an array of their payment activity (up to 5000 most recent, ordered newest first; if "rowCount" > "sent", older rows were omitted)
- "rowCount" / "sent": as labeled
- "aggregates": precomputed from those same transaction rows. For payment methods, you MUST use \`aggregates.distinct_payment_method_count\` and \`aggregates.distinct_payment_method_values\` — the number you state (e.g. "two", "2") must exactly match that count, and the list of methods you name must be exactly that set, with no extra or missing types. If you say "N payment methods" then N must equal distinct_payment_method_count.

Use ONLY this JSON. Do not invent data.
- "Purchase" / "payment" / "paid" / "revenue" usually means status "succeeded" unless the question asks for failed or all.
- Person names: case-insensitive; partial match ok (e.g. "Arnav" vs "Arnav Kumar"); use payer_name / payer_email when relevant.
- Counts (times, how many, totals): be numerically exact; if unsure, re-check the array or aggregates.
- Amounts: sum amount for relevant rows; US-style currency for usd.
- If the data is empty, say so clearly. Never contradict aggregates (e.g. never say "three methods" if distinct_payment_method_count is 2).
- Transaction "date" values are stored as UTC. When you describe a time for the user, prefer their local time zone when a time zone is given in the prompt.`;

async function openaiChat(
  apiKey: string,
  model: string,
  messages: { role: "system" | "user" | "assistant"; content: string }[],
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 1_500,
      messages,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI ${res.status}: ${t.slice(0, 400)}`);
  }
  const out = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = out.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty model response");
  return text;
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Set OPENAI_API_KEY in the server environment." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const model = process.env.OPENAI_REPORTS_MODEL?.trim() || "gpt-4o-mini";
  const timeZone = normalizeTimeZone(
    typeof parsed.data.timeZone === "string" ? parsed.data.timeZone : undefined,
  );

  const { data: raw, error: txErr } = await supabase
    .from("transactions")
    .select("*, payment_pages(title, slug)")
    .order("created_at", { ascending: false })
    .limit(8_000);

  if (txErr) {
    console.error("[reports/ask] load transactions", txErr);
    return NextResponse.json(
      { error: "Could not load your transactions. Check that you are signed in." },
      { status: 500 },
    );
  }

  const rows = (raw ?? []) as (TransactionRow & {
    payment_pages: { title: string; slug: string } | null;
  })[];
  const mapped: ReportTx[] = rows.map((r) => ({
    ...r,
    payment_pages: r.payment_pages
      ? { title: r.payment_pages.title, slug: r.payment_pages.slug }
      : null,
  })) as ReportTx[];

  const payload = buildAskPayloadFromRows(mapped);
  const dataJson = JSON.stringify(
    {
      rowCount: payload.rowCount,
      sent: payload.sent,
      aggregates: payload.aggregates,
      transactions: payload.transactions,
    },
    null,
    0,
  );

  const useStructured = process.env.REPORTS_ASK_STRUCTURED !== "0";

  let answer: string | undefined;

  if (useStructured) {
    try {
      const classified = await classifyReportQuestion(
        apiKey,
        model,
        parsed.data.question,
        timeZone,
      );
      if (classified) {
        const exec = runReportAskTemplate(classified.templateId, mapped, classified.slots, {
          timeZone,
        });
        if (exec) {
          answer = buildStructuredNarration(
            classified.templateId,
            classified.slots,
            exec.result,
            timeZone,
          );
        }
      }
    } catch (e) {
      console.warn("[reports/ask] structured path", e);
    }
  }

  if (!answer) {
    try {
      answer = await openaiChat(apiKey, model, [
        { role: "system", content: ANSWER_SYSTEM },
        {
          role: "user",
          content: `The user's IANA time zone: ${timeZone} (use for interpreting "today", "this month", and clock times; rows are still UTC in the JSON).
Question: ${parsed.data.question}\n\nData:\n${dataJson}\n\nAnswer the question in clear, concise language.`,
        },
      ]);
    } catch (e) {
      console.error("[reports/ask] OpenAI", e);
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "OpenAI error." },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({
    answer,
    rowCount: payload.rowCount,
    sent: payload.sent,
    model,
    source: "supabase", // not raw Postgres — uses API + RLS, no DATABASE_URL
  });
}
