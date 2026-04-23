import { NextResponse } from "next/server";
import { z } from "zod";
import { validateAmountForPage } from "@/lib/amounts";
import { getStripe } from "@/lib/stripe";
import { PAYMENT_PAGE_PUBLIC_SELECT } from "@/lib/payment-page-public-select";
import { createPublicClient } from "@/lib/supabase/public";
import { validateCustomFieldResponses } from "@/lib/validate-fields";
import type { CustomFieldRow, PublicPaymentPageRow } from "@/types/qpp";

const bodySchema = z.object({
  slug: z.string().min(1),
  amount: z.number().positive(),
  payer_email: z.string().email(),
  payer_name: z.string().min(1).max(200),
  field_values: z.record(z.string(), z.string()).optional().default({}),
});

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

  const { slug, amount, payer_email, payer_name, field_values } = parsed.data;

  const supabase = createPublicClient();
  const { data: page, error: pageErr } = await supabase
    .from("payment_pages")
    .select(PAYMENT_PAGE_PUBLIC_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (pageErr || !page) {
    return NextResponse.json({ error: "Payment page not found." }, { status: 404 });
  }

  const p = page as unknown as PublicPaymentPageRow;
  const amountErr = validateAmountForPage(p, amount);
  if (amountErr) {
    return NextResponse.json({ error: amountErr }, { status: 400 });
  }

  const { data: fieldsRaw, error: fieldsErr } = await supabase
    .from("custom_fields")
    .select("*")
    .eq("page_id", p.id)
    .order("sort_order", { ascending: true });

  if (fieldsErr) {
    return NextResponse.json({ error: "Could not load form fields." }, { status: 500 });
  }

  const fields = (fieldsRaw ?? []) as CustomFieldRow[];
  if (fields.length > 10) {
    return NextResponse.json({ error: "Page has too many custom fields." }, { status: 400 });
  }

  const fieldErr = validateCustomFieldResponses(fields, field_values);
  if (fieldErr) {
    return NextResponse.json({ error: fieldErr }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const pi = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      receipt_email: payer_email,
      automatic_payment_methods: { enabled: true },
      metadata: {
        page_id: p.id,
        slug: p.slug,
        payer_email: payer_email.slice(0, 450),
        payer_name: payer_name.slice(0, 450),
      },
      description: `${p.title} (QPP)`,
    });

    return NextResponse.json({
      clientSecret: pi.client_secret,
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Payment setup failed." }, { status: 502 });
  }
}
