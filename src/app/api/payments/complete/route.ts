import { format } from "date-fns";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { validateAmountForPage, roundMoney } from "@/lib/amounts";
import {
  formatCustomFieldsBlock,
  renderEmailHtml,
  renderEmailSubject,
  renderPayeeEmailHtml,
  renderPayeeEmailSubject,
} from "@/lib/email-template";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { validateCustomFieldResponses } from "@/lib/validate-fields";
import type { CustomFieldRow, PaymentPageRow } from "@/types/qpp";

const bodySchema = z.object({
  payment_intent_id: z.string().min(1),
  slug: z.string().min(1),
  amount: z.number().positive(),
  payer_email: z.string().email().optional(),
  payer_name: z.string().min(1).max(200).optional(),
  field_values: z.record(z.string(), z.string()).optional().default({}),
});

/** Strip accidental wrapping quotes from .env; default to Resend test sender. */
function normalizeResendFrom(raw: string | undefined): string {
  const fallback = "onboarding@resend.dev";
  if (!raw?.trim()) return fallback;
  let s = raw.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s || fallback;
}

async function resolvePayeeEmail(
  admin: ReturnType<typeof createAdminClient>,
  page: PaymentPageRow,
): Promise<string | null> {
  const fromPage = page.payee_notification_email?.trim();
  if (fromPage) {
    const ok = z.string().email().safeParse(fromPage);
    return ok.success ? ok.data : null;
  }
  const { data, error } = await admin.auth.admin.getUserById(page.created_by);
  if (error) {
    console.error("[QPP] payee email: could not load page creator", error.message);
    return null;
  }
  const em = data.user?.email?.trim();
  if (!em) return null;
  const ok = z.string().email().safeParse(em);
  return ok.success ? ok.data : null;
}

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { payment_intent_id, slug, amount, field_values } = parsed.data;
  let payer_email = parsed.data.payer_email;
  let payer_name = parsed.data.payer_name;

  const stripe = getStripe();
  let pi: Awaited<ReturnType<typeof stripe.paymentIntents.retrieve>>;
  try {
    pi = await stripe.paymentIntents.retrieve(payment_intent_id);
  } catch {
    return NextResponse.json({ error: "Invalid payment reference." }, { status: 400 });
  }

  if (pi.status !== "succeeded") {
    return NextResponse.json(
      { error: "Payment has not completed yet.", status: pi.status },
      { status: 409 },
    );
  }

  if (pi.metadata?.slug !== slug || !pi.metadata?.page_id) {
    return NextResponse.json({ error: "Payment does not match this page." }, { status: 400 });
  }

  if (!payer_email?.trim() && pi.metadata.payer_email) {
    payer_email = pi.metadata.payer_email;
  }
  if (!payer_name?.trim() && pi.metadata.payer_name) {
    payer_name = pi.metadata.payer_name;
  }
  if (!payer_email?.trim() || !payer_name?.trim()) {
    return NextResponse.json({ error: "Missing payer details." }, { status: 400 });
  }

  const emailOk = z.string().email().safeParse(payer_email.trim());
  if (!emailOk.success) {
    return NextResponse.json({ error: "Invalid payer email on payment record." }, { status: 400 });
  }
  payer_email = emailOk.data;
  payer_name = payer_name.trim();

  const piAmount = roundMoney((pi.amount_received ?? pi.amount) / 100);
  if (roundMoney(amount) !== piAmount) {
    return NextResponse.json({ error: "Amount mismatch." }, { status: 400 });
  }

  const pub = createPublicClient();
  const { data: page, error: pageErr } = await pub
    .from("payment_pages")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (pageErr || !page || page.id !== pi.metadata.page_id) {
    return NextResponse.json({ error: "Page not found." }, { status: 404 });
  }

  const p = page as PaymentPageRow;
  const amountErr = validateAmountForPage(p, amount);
  if (amountErr) {
    return NextResponse.json({ error: amountErr }, { status: 400 });
  }

  const { data: fieldsRaw } = await pub
    .from("custom_fields")
    .select("*")
    .eq("page_id", p.id)
    .order("sort_order", { ascending: true });

  const fields = (fieldsRaw ?? []) as CustomFieldRow[];
  const fieldErr = validateCustomFieldResponses(fields, field_values);
  if (fieldErr) {
    return NextResponse.json({ error: fieldErr }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("transactions")
    .select("id")
    .eq("stripe_payment_intent_id", payment_intent_id)
    .maybeSingle();

  if (existing?.id) {
    return NextResponse.json({ ok: true, transaction_id: existing.id, duplicate: true });
  }

  let paymentMethodType: string | null = null;
  if (typeof pi.payment_method === "string") {
    try {
      const pm = await stripe.paymentMethods.retrieve(pi.payment_method);
      paymentMethodType = pm.type;
    } catch {
      paymentMethodType = "card";
    }
  }

  const { data: tx, error: txErr } = await admin
    .from("transactions")
    .insert({
      page_id: p.id,
      amount: piAmount,
      currency: (pi.currency ?? "usd").toLowerCase(),
      status: "succeeded",
      payment_method_type: paymentMethodType,
      payer_email,
      payer_name,
      stripe_payment_intent_id: payment_intent_id,
      gl_codes_snapshot: p.gl_codes ?? [],
      metadata: { slug: p.slug },
    })
    .select("id")
    .single();

  if (txErr || !tx) {
    console.error(txErr);
    return NextResponse.json({ error: "Could not save transaction." }, { status: 500 });
  }

  const responses = fields
    .map((f) => {
      const val = field_values[f.id]?.trim() ?? "";
      if (!val) return null;
      return {
        transaction_id: tx.id,
        field_id: f.id,
        field_label_snapshot: f.label,
        value: val,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r != null);

  if (responses.length) {
    const { error: respErr } = await admin.from("field_responses").insert(responses);
    if (respErr) console.error(respErr);
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const fromRaw = process.env.RESEND_FROM_EMAIL?.trim();
  /** Resend: use plain onboarding@resend.dev for tests, or verify your domain and use e.g. pay@yourdomain.com */
  const from = normalizeResendFrom(fromRaw);
  if (resendKey) {
    try {
      const resend = new Resend(resendKey);
      const dateFormatted = format(new Date(), "PPpp");
      const amountFormatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(piAmount);
      const customHtml = formatCustomFieldsBlock(fields, field_values);
      const html = renderEmailHtml({
        template: p.email_body_html,
        payerName: payer_name,
        amountFormatted,
        transactionId: tx.id,
        dateFormatted,
        pageTitle: p.title,
        customFieldsHtml: customHtml,
      });
      const subject = renderEmailSubject(p.email_subject, p.title);
      const { data: sent, error: sendErr } = await resend.emails.send({
        from,
        to: payer_email,
        subject,
        html,
      });
      if (sendErr) {
        console.error(
          "[QPP] Resend rejected email:",
          sendErr.name,
          sendErr.message,
          "status:",
          sendErr.statusCode,
          "| from:",
          from,
          "| to:",
          payer_email,
        );
      } else if (sent?.id) {
        console.info("[QPP] Resend payer email id:", sent.id);
      }

      const payeeEmail = await resolvePayeeEmail(admin, p);
      if (payeeEmail && payeeEmail.toLowerCase() !== payer_email.toLowerCase()) {
        const payeeHtml = renderPayeeEmailHtml({
          template: p.email_payee_body_html,
          payerName: payer_name,
          payerEmail: payer_email,
          amountFormatted,
          transactionId: tx.id,
          dateFormatted,
          pageTitle: p.title,
          customFieldsHtml: customHtml,
        });
        const payeeSubject = renderPayeeEmailSubject(
          p.email_payee_subject,
          p.title,
          payer_name,
          payer_email,
          amountFormatted,
          tx.id,
          dateFormatted,
        );
        const { data: payeeSent, error: payeeErr } = await resend.emails.send({
          from,
          to: payeeEmail,
          subject: payeeSubject,
          html: payeeHtml,
        });
        if (payeeErr) {
          console.error(
            "[QPP] Resend rejected payee email:",
            payeeErr.name,
            payeeErr.message,
            "status:",
            payeeErr.statusCode,
            "| to:",
            payeeEmail,
          );
        } else if (payeeSent?.id) {
          console.info("[QPP] Resend payee email id:", payeeSent.id);
        }
      } else if (!payeeEmail) {
        console.warn("[QPP] No payee notification email; set one on the page or ensure the creator has an email.");
      }
    } catch (e) {
      console.error("[QPP] Resend exception", e);
    }
  }

  return NextResponse.json({ ok: true, transaction_id: tx.id });
}
