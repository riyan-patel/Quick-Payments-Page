import { format } from "date-fns";
import { Resend } from "resend";
import { z } from "zod";
import {
  formatCustomFieldsBlock,
  renderEmailHtml,
  renderEmailSubject,
  renderPayeeEmailHtml,
  renderPayeeEmailSubject,
} from "@/lib/email-template";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CustomFieldRow, PaymentPageRow } from "@/types/qpp";

type Admin = ReturnType<typeof createAdminClient>;

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

async function resolvePayeeEmail(admin: Admin, page: PaymentPageRow): Promise<string | null> {
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

/** `payerSuccess` / `payeeSuccess` are true when that send was not tried (`send*` false) or the send succeeded. */
export type ReceiptEmailResult = { payerSuccess: boolean; payeeSuccess: boolean };

/**
 * Idempotent: pass sendPayer / sendPayee from metadata flags to only send what is still needed.
 */
export async function sendPaymentReceiptEmails(params: {
  admin: Admin;
  page: PaymentPageRow;
  fields: CustomFieldRow[];
  fieldValues: Record<string, string>;
  transactionId: string;
  amountUsd: number;
  payerEmail: string;
  payerName: string;
  sendPayer: boolean;
  sendPayee: boolean;
}): Promise<ReceiptEmailResult> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from = normalizeResendFrom(process.env.RESEND_FROM_EMAIL);
  if (!resendKey) {
    if (params.sendPayer || params.sendPayee) {
      console.error(
        "[QPP] RESEND_API_KEY is not set — no payer or host confirmation email was sent. Add RESEND_API_KEY to your server environment (e.g. Vercel / .env.local).",
      );
    }
    return {
      payerSuccess: !params.sendPayer,
      payeeSuccess: !params.sendPayee,
    };
  }

  const resend = new Resend(resendKey);
  const dateFormatted = format(new Date(), "PPpp");
  const amountFormatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(params.amountUsd);
  const customHtml = formatCustomFieldsBlock(params.fields, params.fieldValues);
  const p = params.page;

  let payerSuccess = !params.sendPayer;
  let payeeSuccess = !params.sendPayee;

  // IMPORTANT: Send the customer (payer) confirmation first, without waiting on
  // payee/merchant address lookup. Host lookup only blocks the *merchant* email.
  if (params.sendPayer) {
    const html = renderEmailHtml({
      template: p.email_body_html,
      payerName: params.payerName,
      amountFormatted,
      transactionId: params.transactionId,
      dateFormatted,
      pageTitle: p.title,
      customFieldsHtml: customHtml,
    });
    const subject = renderEmailSubject(p.email_subject, p.title);
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, 500));
        }
        const { data: sent, error: sendErr } = await resend.emails.send({
          from,
          to: params.payerEmail,
          subject,
          html,
        });
        if (sendErr) {
          console.error(
            "[QPP] Resend — payer (customer) email rejected:",
            sendErr.name,
            sendErr.message,
            "status:",
            sendErr.statusCode,
            "| from:",
            from,
            "| to:",
            params.payerEmail,
            attempt < 1 ? "(will retry once)" : "",
          );
          if (attempt === 1) payerSuccess = false;
        } else {
          payerSuccess = true;
          if (sent?.id) {
            console.info("[QPP] Resend — payer (customer) email id:", sent.id);
          }
          break;
        }
      } catch (e) {
        console.error(
          "[QPP] Resend — payer (customer) email exception",
          attempt < 1 ? "(will retry once)" : "",
          e,
        );
        if (attempt === 1) payerSuccess = false;
      }
    }
  }

  const payeeInbox = params.sendPayee ? await resolvePayeeEmail(params.admin, p) : null;
  if (params.sendPayee && !payeeInbox) {
    console.warn(
      "[QPP] No payee notification email; set payee notification on the page or ensure the page creator has an account email.",
    );
    payeeSuccess = true;
  }

  if (params.sendPayee && payeeInbox) {
    try {
      const payeeHtml = renderPayeeEmailHtml({
        template: p.email_payee_body_html,
        payerName: params.payerName,
        payerEmail: params.payerEmail,
        amountFormatted,
        transactionId: params.transactionId,
        dateFormatted,
        pageTitle: p.title,
        customFieldsHtml: customHtml,
      });
      const payeeSubject = renderPayeeEmailSubject(
        p.email_payee_subject,
        p.title,
        params.payerName,
        params.payerEmail,
        amountFormatted,
        params.transactionId,
        dateFormatted,
      );
      const { data: payeeSent, error: payeeErr } = await resend.emails.send({
        from,
        to: payeeInbox,
        subject: payeeSubject,
        html: payeeHtml,
      });
      if (payeeErr) {
        console.error(
          "[QPP] Resend — payee (host) email rejected:",
          payeeErr.name,
          payeeErr.message,
          "status:",
          payeeErr.statusCode,
          "| to:",
          payeeInbox,
        );
        payeeSuccess = false;
      } else {
        payeeSuccess = true;
        if (payeeSent?.id) console.info("[QPP] Resend — payee (host) email id:", payeeSent.id);
      }
    } catch (e) {
      console.error("[QPP] Resend — payee (host) email exception", e);
      payeeSuccess = false;
    }
  }

  return { payerSuccess, payeeSuccess };
}
