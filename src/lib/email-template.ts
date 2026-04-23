import type { CustomFieldRow } from "@/types/qpp";
import { parseOptions } from "@/types/qpp";

const DEFAULT_SUBJECT = "Payment confirmation — {{page_title}}";

const DEFAULT_BODY = `<p>Hi {{payer_name}},</p>
<p>Thank you. We received <strong>{{amount}}</strong> for <strong>{{page_title}}</strong>.</p>
<p>Transaction ID: {{transaction_id}}<br />Date: {{date}}</p>
<p>{{custom_fields}}</p>
<p>— {{page_title}}</p>`;

export function defaultEmailSubject(pageTitle: string) {
  return DEFAULT_SUBJECT.replaceAll("{{page_title}}", pageTitle);
}

export function defaultEmailBody() {
  return DEFAULT_BODY;
}

export function formatCustomFieldsBlock(
  fields: CustomFieldRow[],
  values: Record<string, string>,
) {
  const lines: string[] = [];
  for (const f of fields) {
    const v = values[f.id];
    if (v === undefined || v === "") continue;
    lines.push(`${f.label}: ${v}`);
  }
  if (lines.length === 0) return "";
  return lines.map((l) => `<div>${escapeHtml(l)}</div>`).join("");
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderEmailHtml(params: {
  template: string | null | undefined;
  payerName: string;
  amountFormatted: string;
  transactionId: string;
  dateFormatted: string;
  pageTitle: string;
  customFieldsHtml: string;
}) {
  const tpl = params.template?.trim() ? params.template : DEFAULT_BODY;
  return tpl
    .replaceAll("{{payer_name}}", escapeHtml(params.payerName))
    .replaceAll("{{amount}}", escapeHtml(params.amountFormatted))
    .replaceAll("{{transaction_id}}", escapeHtml(params.transactionId))
    .replaceAll("{{date}}", escapeHtml(params.dateFormatted))
    .replaceAll("{{page_title}}", escapeHtml(params.pageTitle))
    .replaceAll("{{custom_fields}}", params.customFieldsHtml || "");
}

export function renderEmailSubject(
  template: string | null | undefined,
  pageTitle: string,
) {
  const subj = template?.trim()
    ? template
    : DEFAULT_SUBJECT.replaceAll("{{page_title}}", pageTitle);
  return subj
    .replaceAll("{{page_title}}", pageTitle)
    .replaceAll("{{payer_name}}", "")
    .replaceAll("{{amount}}", "")
    .replaceAll("{{transaction_id}}", "")
    .replaceAll("{{date}}", "")
    .replaceAll("{{custom_fields}}", "");
}

export { parseOptions };
