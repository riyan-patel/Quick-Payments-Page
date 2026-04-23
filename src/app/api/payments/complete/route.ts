import { NextResponse } from "next/server";
import { z } from "zod";
import { validateAmountForPage, roundMoney } from "@/lib/amounts";
import { getStripe } from "@/lib/stripe";
import { getCustomFieldsForPage } from "@/lib/custom-fields-for-page";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { validateCustomFieldResponses } from "@/lib/validate-fields";
import type { CustomFieldRow, PaymentPageRow } from "@/types/qpp";
import { sendPaymentReceiptEmails } from "./receipt-emails";

const bodySchema = z.object({
  payment_intent_id: z.string().min(1),
  slug: z.string().min(1),
  amount: z.number().positive(),
  payer_email: z.string().email().optional(),
  payer_name: z.string().min(1).max(200).optional(),
  field_values: z.record(z.string(), z.string()).optional().default({}),
});

function readTxEmailFlags(meta: unknown): { payer: boolean; payee: boolean } {
  if (!meta || typeof meta !== "object") return { payer: false, payee: false };
  const o = meta as Record<string, unknown>;
  return {
    payer: o.payer_receipt_sent === true,
    payee: o.payee_receipt_sent === true,
  };
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
    .eq("is_active", true)
    .maybeSingle();

  if (pageErr || !page || page.id !== pi.metadata.page_id) {
    return NextResponse.json(
      { error: "This payment page is not available or was disabled." },
      { status: 404 },
    );
  }

  const p = page as PaymentPageRow;
  const amountErr = validateAmountForPage(p, amount);
  if (amountErr) {
    return NextResponse.json({ error: amountErr }, { status: 400 });
  }

  let fields: CustomFieldRow[];
  try {
    fields = (await getCustomFieldsForPage(pub, p.id)).data;
  } catch {
    return NextResponse.json(
      { error: "Could not load form fields for validation." },
      { status: 500 },
    );
  }
  const fieldErr = validateCustomFieldResponses(fields, field_values);
  if (fieldErr) {
    return NextResponse.json({ error: fieldErr }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("transactions")
    .select("id, metadata")
    .eq("stripe_payment_intent_id", payment_intent_id)
    .maybeSingle();

  const mergeAndPersistEmailFlags = async (
    transactionId: string,
    baseMeta: Record<string, unknown>,
    r: { payerSuccess: boolean; payeeSuccess: boolean },
    sendPayer: boolean,
    sendPayee: boolean,
  ) => {
    const next: Record<string, unknown> = { ...baseMeta, slug: p.slug };
    if (sendPayer && r.payerSuccess) next.payer_receipt_sent = true;
    if (sendPayee && r.payeeSuccess) next.payee_receipt_sent = true;
    const { error } = await admin.from("transactions").update({ metadata: next }).eq("id", transactionId);
    if (error) {
      console.error("[QPP] could not update transaction email metadata", error.message);
    }
  };

  if (existing?.id) {
    const sent = readTxEmailFlags(existing.metadata);
    // Payee: we only skip resend if a previous run recorded it; first run may have had no payee address.
    const sendPayer = !sent.payer;
    const sendPayee = !sent.payee;
    if (!sendPayer && !sendPayee) {
      return NextResponse.json({ ok: true, transaction_id: existing.id, duplicate: true });
    }
    const r = await sendPaymentReceiptEmails({
      admin,
      page: p,
      fields,
      fieldValues: field_values,
      transactionId: existing.id,
      amountUsd: piAmount,
      payerEmail: payer_email,
      payerName: payer_name,
      sendPayer,
      sendPayee,
    });
    const prev =
      existing.metadata && typeof existing.metadata === "object"
        ? (existing.metadata as Record<string, unknown>)
        : {};
    await mergeAndPersistEmailFlags(existing.id, prev, r, sendPayer, sendPayee);
    return NextResponse.json({
      ok: true,
      transaction_id: existing.id,
      duplicate: true,
      receiptRetry: true,
      emails: { payer: r.payerSuccess, payee: r.payeeSuccess },
    });
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

  const emailFlags = readTxEmailFlags({ slug: p.slug });
  const r = await sendPaymentReceiptEmails({
    admin,
    page: p,
    fields,
    fieldValues: field_values,
    transactionId: tx.id,
    amountUsd: piAmount,
    payerEmail: payer_email,
    payerName: payer_name,
    sendPayer: !emailFlags.payer,
    sendPayee: !emailFlags.payee,
  });
  await mergeAndPersistEmailFlags(
    tx.id,
    { slug: p.slug },
    r,
    !emailFlags.payer,
    !emailFlags.payee,
  );

  return NextResponse.json({
    ok: true,
    transaction_id: tx.id,
    emails: { payer: r.payerSuccess, payee: r.payeeSuccess },
  });
}
