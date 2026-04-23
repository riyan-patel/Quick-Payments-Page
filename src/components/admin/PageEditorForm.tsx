"use client";

import { useActionState, useMemo, useState } from "react";
import type { SavePageState } from "@/app/admin/actions";
import { savePaymentPage } from "@/app/admin/actions";
import type { AmountMode, CustomFieldRow, FieldType, PaymentPageRow } from "@/types/qpp";
import { parseOptions } from "@/types/qpp";
import clsx from "clsx";

type DraftField = {
  clientKey: string;
  id?: string;
  label: string;
  field_type: FieldType;
  optionsText: string;
  required: boolean;
  placeholder: string;
  helper_text: string;
};

const VARIABLES = [
  "{{payer_name}}",
  "{{amount}}",
  "{{transaction_id}}",
  "{{date}}",
  "{{page_title}}",
  "{{custom_fields}}",
];

function newKey() {
  return `k-${Math.random().toString(36).slice(2, 10)}`;
}

/** Consistent light form controls (readable in all OS theme settings). */
const control =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-0";

const controlSm =
  "w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-teal-600";

const selectControl =
  "w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-teal-600";

export function PageEditorForm({
  initialPage,
  initialFields,
}: {
  initialPage?: PaymentPageRow;
  initialFields?: CustomFieldRow[];
}) {
  const [state, formAction] = useActionState(savePaymentPage, {} as SavePageState);

  const [amountMode, setAmountMode] = useState<AmountMode>(
    initialPage?.amount_mode ?? "fixed",
  );

  const [brandColor, setBrandColor] = useState(initialPage?.brand_color ?? "#0f766e");

  const [fields, setFields] = useState<DraftField[]>(() => {
    if (initialFields?.length) {
      return initialFields.map((f) => ({
        clientKey: f.id,
        id: f.id,
        label: f.label,
        field_type: f.field_type,
        optionsText: parseOptions(f.options).join(", "),
        required: f.required,
        placeholder: f.placeholder ?? "",
        helper_text: f.helper_text ?? "",
      }));
    }
    return [];
  });

  const fieldsJson = useMemo(
    () =>
      JSON.stringify(
        fields.map((f, i) => ({
          id: f.id,
          label: f.label,
          field_type: f.field_type,
          options: f.field_type === "dropdown" ? f.optionsText.split(",").map((s) => s.trim()).filter(Boolean) : [],
          required: f.required,
          placeholder: f.placeholder || null,
          helper_text: f.helper_text || null,
          sort_order: i,
        })),
      ),
    [fields],
  );

  const addField = () => {
    if (fields.length >= 10) return;
    setFields((prev) => [
      ...prev,
      {
        clientKey: newKey(),
        label: "New field",
        field_type: "text",
        optionsText: "",
        required: false,
        placeholder: "",
        helper_text: "",
      },
    ]);
  };

  const move = (idx: number, dir: -1 | 1) => {
    setFields((prev) => {
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  const remove = (idx: number) => {
    setFields((prev) => prev.filter((_, i) => i !== idx));
  };

  const update = (idx: number, patch: Partial<DraftField>) => {
    setFields((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  };

  return (
    <form action={formAction} className="mx-auto max-w-3xl space-y-8 pb-20">
      {initialPage?.id ? <input type="hidden" name="id" value={initialPage.id} /> : null}
      <input type="hidden" name="fields_json" value={fieldsJson} />
      <input type="hidden" name="brand_color" value={brandColor} />

      {state?.error ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900">
          {state.error}
        </div>
      ) : null}

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Page & URL</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <label htmlFor="slug" className="text-sm font-medium text-zinc-800">
              URL slug
            </label>
            <input
              id="slug"
              name="slug"
              required
              defaultValue={initialPage?.slug}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              title="Lowercase letters, numbers, and hyphens only — e.g. yoga-class. Do not paste https:// or /pay/."
              className={control}
              placeholder="yoga-class"
              aria-describedby="slug-help"
            />
            <p id="slug-help" className="text-xs text-zinc-600">
              Enter <strong className="font-medium text-zinc-800">only the slug</strong> (e.g.{" "}
              <code className="rounded bg-zinc-100 px-1 text-zinc-800">yoga-class</code>), not a full
              URL. Public page will be{" "}
              <code className="rounded bg-zinc-100 px-1 text-zinc-800">/pay/your-slug</code>.
            </p>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label htmlFor="title" className="text-sm font-medium text-zinc-800">
              Title
            </label>
            <input
              id="title"
              name="title"
              required
              defaultValue={initialPage?.title}
              className={control}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label htmlFor="subtitle" className="text-sm font-medium text-zinc-800">
              Subtitle / description
            </label>
            <textarea
              id="subtitle"
              name="subtitle"
              rows={2}
              defaultValue={initialPage?.subtitle ?? ""}
              className={control}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Branding</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <label htmlFor="logo_url" className="text-sm font-medium text-zinc-800">
              Logo URL
            </label>
            <input
              id="logo_url"
              name="logo_url"
              type="text"
              inputMode="url"
              defaultValue={initialPage?.logo_url ?? ""}
              placeholder="https://…"
              className={control}
            />
          </div>
          <div className="space-y-1">
            <span id="brand-color-label" className="text-sm font-medium text-zinc-800">
              Primary brand color
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border border-zinc-300 bg-white"
                aria-labelledby="brand-color-label"
              />
              <span className="font-mono text-sm text-zinc-600" aria-live="polite">
                {brandColor}
              </span>
            </div>
          </div>
        </div>
        <p className="text-xs text-zinc-500">
          Submitted as <code className="rounded bg-zinc-100 px-1">#rrggbb</code> for buttons and Stripe
          appearance.
        </p>
        <div className="space-y-1">
          <label htmlFor="header_message" className="text-sm font-medium text-zinc-800">
            Header message
          </label>
          <textarea
            id="header_message"
            name="header_message"
            rows={2}
            defaultValue={initialPage?.header_message ?? ""}
            className={control}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="footer_message" className="text-sm font-medium text-zinc-800">
            Footer message
          </label>
          <textarea
            id="footer_message"
            name="footer_message"
            rows={2}
            defaultValue={initialPage?.footer_message ?? ""}
            className={control}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="trust_panel" className="text-sm font-medium text-zinc-800">
            Trust &amp; transparency panel (differentiator)
          </label>
          <textarea
            id="trust_panel"
            name="trust_panel"
            rows={4}
            defaultValue={initialPage?.trust_panel ?? ""}
            placeholder="Explain fees, refund policy, or how payers’ data is used. Shown in a highlighted panel on the public page."
            className={control}
          />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Amount</h2>
        <fieldset className="space-y-2 border-0 p-0">
          <legend className="text-sm font-medium text-zinc-800">Amount mode</legend>
          {(["fixed", "range", "open"] as const).map((m) => (
            <label key={m} className="flex items-center gap-2 text-sm text-zinc-800">
              <input
                type="radio"
                name="amount_mode"
                value={m}
                checked={amountMode === m}
                onChange={() => setAmountMode(m)}
                className="size-4 border-zinc-400 text-teal-700 focus-visible:ring-2 focus-visible:ring-teal-600"
              />
              {m === "fixed" && "Fixed amount"}
              {m === "range" && "Min / max range"}
              {m === "open" && "Payer enters amount"}
            </label>
          ))}
        </fieldset>
        {amountMode === "fixed" ? (
          <div className="space-y-1">
            <label htmlFor="fixed_amount" className="text-sm font-medium text-zinc-800">
              Fixed amount (USD)
            </label>
            <input
              id="fixed_amount"
              name="fixed_amount"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={initialPage?.fixed_amount ?? ""}
              className={`${control} max-w-xs`}
            />
          </div>
        ) : null}
        {amountMode === "range" ? (
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <label htmlFor="min_amount" className="text-sm font-medium text-zinc-800">
                Minimum
              </label>
              <input
                id="min_amount"
                name="min_amount"
                type="number"
                step="0.01"
                defaultValue={initialPage?.min_amount ?? ""}
                className={`${control} max-w-[10rem]`}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="max_amount" className="text-sm font-medium text-zinc-800">
                Maximum
              </label>
              <input
                id="max_amount"
                name="max_amount"
                type="number"
                step="0.01"
                defaultValue={initialPage?.max_amount ?? ""}
                className={`${control} max-w-[10rem]`}
              />
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-zinc-900">Custom fields (max 10)</h2>
          <button
            type="button"
            onClick={addField}
            disabled={fields.length >= 10}
            className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-sm font-medium text-zinc-800 disabled:opacity-50"
          >
            Add field
          </button>
        </div>
        {fields.length === 0 ? (
          <p className="text-sm text-zinc-600">No custom fields yet.</p>
        ) : (
          <ul className="space-y-4">
            {fields.map((f, idx) => (
              <li
                key={f.clientKey}
                className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4"
              >
                <div className="mb-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    aria-label={`Move field ${idx + 1} up`}
                    onClick={() => move(idx, -1)}
                    className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    aria-label={`Move field ${idx + 1} down`}
                    onClick={() => move(idx, 1)}
                    className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800"
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-800"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-700">Label</label>
                    <input
                      value={f.label}
                      onChange={(e) => update(idx, { label: e.target.value })}
                      className={controlSm}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-700">Type</label>
                    <select
                      value={f.field_type}
                      onChange={(e) =>
                        update(idx, { field_type: e.target.value as FieldType })
                      }
                      className={selectControl}
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="dropdown">Dropdown</option>
                      <option value="date">Date</option>
                      <option value="checkbox">Checkbox</option>
                    </select>
                  </div>
                  {f.field_type === "dropdown" ? (
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-medium text-zinc-700">
                        Options (comma-separated)
                      </label>
                      <input
                        value={f.optionsText}
                        onChange={(e) => update(idx, { optionsText: e.target.value })}
                        className={controlSm}
                        placeholder="Monthly, Annual"
                      />
                    </div>
                  ) : null}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="flex items-center gap-2 text-sm text-zinc-800">
                      <input
                        type="checkbox"
                        checked={f.required}
                        onChange={(e) => update(idx, { required: e.target.checked })}
                        className="size-4 rounded border-zinc-400 text-teal-700"
                      />
                      Required
                    </label>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-700">Placeholder</label>
                    <input
                      value={f.placeholder}
                      onChange={(e) => update(idx, { placeholder: e.target.value })}
                      className={controlSm}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-700">Helper text</label>
                    <input
                      value={f.helper_text}
                      onChange={(e) => update(idx, { helper_text: e.target.value })}
                      className={controlSm}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">GL codes</h2>
        <div className="space-y-1">
          <label htmlFor="gl_codes_raw" className="text-sm font-medium text-zinc-800">
            Codes (comma or newline separated)
          </label>
          <textarea
            id="gl_codes_raw"
            name="gl_codes_raw"
            rows={3}
            required
            defaultValue={(initialPage?.gl_codes ?? []).join(", ")}
            placeholder="REV-YOGA-01, CITY-PARK-2025"
            className={`${control} font-mono text-sm`}
          />
          <p className="text-xs text-zinc-500">
            Letters, numbers, and ._-/ — each segment 2–32 characters. Stored on every transaction
            for reporting.
          </p>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Confirmation email (Resend)</h2>
        <p className="text-sm text-zinc-600">
          Variables:{" "}
          {VARIABLES.map((v) => (
            <code key={v} className="mr-1 rounded bg-zinc-100 px-1 text-xs">
              {v}
            </code>
          ))}
        </p>
        <div className="space-y-1">
          <label htmlFor="email_subject" className="text-sm font-medium text-zinc-800">
            Subject
          </label>
          <input
            id="email_subject"
            name="email_subject"
            defaultValue={initialPage?.email_subject ?? ""}
            placeholder="Payment received — {{page_title}}"
            className={control}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="email_body_html" className="text-sm font-medium text-zinc-800">
            HTML body
          </label>
          <textarea
            id="email_body_html"
            name="email_body_html"
            rows={10}
            defaultValue={initialPage?.email_body_html ?? ""}
            placeholder="<p>Hi {{payer_name}}, …</p>"
            className={`${control} font-mono text-sm`}
          />
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-800">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={initialPage?.is_active ?? true}
            className="size-4 rounded border-zinc-300 text-teal-700"
          />
          Page is active (publicly accessible)
        </label>
        <button
          type="submit"
          className={clsx(
            "ml-auto rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800",
          )}
        >
          Save payment page
        </button>
      </section>
    </form>
  );
}
