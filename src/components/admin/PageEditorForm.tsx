"use client";

import { useActionState, useMemo, useState } from "react";
import type { SavePageState } from "@/app/admin/actions";
import { savePaymentPage } from "@/app/admin/actions";
import type { AmountMode, CustomFieldRow, FieldType, PaymentPageRow } from "@/types/qpp";
import { parseOptions } from "@/types/qpp";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

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

const inputSm = "h-7 min-h-7 py-1 text-[0.8rem]";

const selectSm = cn(
  inputSm,
  "w-full rounded-lg border border-input bg-background px-2 shadow-none outline-none",
  "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
);

function newKey() {
  return `k-${Math.random().toString(36).slice(2, 10)}`;
}

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
          options:
            f.field_type === "dropdown"
              ? f.optionsText
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              : [],
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
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Page & URL</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="slug">URL slug</Label>
            <Input
              id="slug"
              name="slug"
              required
              defaultValue={initialPage?.slug}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              title="Lowercase letters, numbers, and hyphens only — e.g. yoga-class. Do not paste https:// or /pay/."
              placeholder="yoga-class"
              aria-describedby="slug-help"
            />
            <p id="slug-help" className="text-xs text-muted-foreground">
              Enter <strong className="font-medium text-foreground">only the slug</strong> (e.g.{" "}
              <code className="rounded bg-muted px-1 text-foreground">yoga-class</code>), not a full
              URL. Public page will be{" "}
              <code className="rounded bg-muted px-1 text-foreground">/pay/your-slug</code>.
            </p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required defaultValue={initialPage?.title} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="subtitle">Subtitle / description</Label>
            <Textarea id="subtitle" name="subtitle" rows={2} defaultValue={initialPage?.subtitle ?? ""} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="logo_url">Logo URL</Label>
              <Input
                id="logo_url"
                name="logo_url"
                type="text"
                inputMode="url"
                defaultValue={initialPage?.logo_url ?? ""}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-2">
              <span id="brand-color-label" className="text-sm font-medium">
                Primary brand color
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded-md border border-input bg-background"
                  aria-labelledby="brand-color-label"
                />
                <span className="font-mono text-sm text-muted-foreground" aria-live="polite">
                  {brandColor}
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Submitted as <code className="rounded bg-muted px-1">#rrggbb</code> for buttons and Stripe
            appearance.
          </p>
          <div className="space-y-2">
            <Label htmlFor="header_message">Header message</Label>
            <Textarea
              id="header_message"
              name="header_message"
              rows={2}
              defaultValue={initialPage?.header_message ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="footer_message">Footer message</Label>
            <Textarea
              id="footer_message"
              name="footer_message"
              rows={2}
              defaultValue={initialPage?.footer_message ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="trust_panel">Trust &amp; transparency panel (differentiator)</Label>
            <Textarea
              id="trust_panel"
              name="trust_panel"
              rows={4}
              defaultValue={initialPage?.trust_panel ?? ""}
              placeholder="Explain fees, refund policy, or how payers’ data is used. Shown in a highlighted panel on the public page."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Amount</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <fieldset className="space-y-2 border-0 p-0">
            <legend className="text-sm font-medium">Amount mode</legend>
            {(["fixed", "range", "open"] as const).map((m) => (
              <label key={m} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="amount_mode"
                  value={m}
                  checked={amountMode === m}
                  onChange={() => setAmountMode(m)}
                  className="size-4 border-input text-primary focus-visible:ring-2 focus-visible:ring-ring"
                />
                {m === "fixed" && "Fixed amount"}
                {m === "range" && "Min / max range"}
                {m === "open" && "Payer enters amount"}
              </label>
            ))}
          </fieldset>
          {amountMode === "fixed" ? (
            <div className="space-y-2">
              <Label htmlFor="fixed_amount">Fixed amount (USD)</Label>
              <Input
                id="fixed_amount"
                name="fixed_amount"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={initialPage?.fixed_amount ?? ""}
                className="max-w-xs"
              />
            </div>
          ) : null}
          {amountMode === "range" ? (
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_amount">Minimum</Label>
                <Input
                  id="min_amount"
                  name="min_amount"
                  type="number"
                  step="0.01"
                  defaultValue={initialPage?.min_amount ?? ""}
                  className="max-w-[10rem]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_amount">Maximum</Label>
                <Input
                  id="max_amount"
                  name="max_amount"
                  type="number"
                  step="0.01"
                  defaultValue={initialPage?.max_amount ?? ""}
                  className="max-w-[10rem]"
                />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle>Custom fields (max 10)</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addField} disabled={fields.length >= 10}>
            Add field
          </Button>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No custom fields yet.</p>
          ) : (
            <ul className="space-y-4">
              {fields.map((f, idx) => (
                <li key={f.clientKey}>
                  <Card className="bg-muted/40 shadow-none">
                    <CardContent className="space-y-3 pt-4">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          aria-label={`Move field ${idx + 1} up`}
                          onClick={() => move(idx, -1)}
                        >
                          Up
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          aria-label={`Move field ${idx + 1} down`}
                          onClick={() => move(idx, 1)}
                        >
                          Down
                        </Button>
                        <Button type="button" size="xs" variant="destructive" onClick={() => remove(idx)}>
                          Remove
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Label</label>
                          <Input
                            value={f.label}
                            onChange={(e) => update(idx, { label: e.target.value })}
                            className={inputSm}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Type</label>
                          <select
                            value={f.field_type}
                            onChange={(e) =>
                              update(idx, { field_type: e.target.value as FieldType })
                            }
                            className={selectSm}
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
                            <label className="text-xs font-medium text-muted-foreground">
                              Options (comma-separated)
                            </label>
                            <Input
                              value={f.optionsText}
                              onChange={(e) => update(idx, { optionsText: e.target.value })}
                              className={inputSm}
                              placeholder="Monthly, Annual"
                            />
                          </div>
                        ) : null}
                        <div className="flex items-center gap-2 sm:col-span-2">
                          <input
                            type="checkbox"
                            checked={f.required}
                            onChange={(e) => update(idx, { required: e.target.checked })}
                            className="size-4 rounded border-input text-primary"
                            id={`req-${f.clientKey}`}
                          />
                          <Label htmlFor={`req-${f.clientKey}`} className="font-normal">
                            Required
                          </Label>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Placeholder</label>
                          <Input
                            value={f.placeholder}
                            onChange={(e) => update(idx, { placeholder: e.target.value })}
                            className={inputSm}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Helper text</label>
                          <Input
                            value={f.helper_text}
                            onChange={(e) => update(idx, { helper_text: e.target.value })}
                            className={inputSm}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>GL codes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="gl_codes_raw">Codes (comma or newline separated)</Label>
          <Textarea
            id="gl_codes_raw"
            name="gl_codes_raw"
            rows={3}
            required
            defaultValue={(initialPage?.gl_codes ?? []).join(", ")}
            placeholder="REV-YOGA-01, CITY-PARK-2025"
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Letters, numbers, and ._-/ — each segment 2–32 characters. Stored on every transaction
            for reporting.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Confirmation email (Resend)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Variables:{" "}
            {VARIABLES.map((v) => (
              <code key={v} className="mr-1 rounded bg-muted px-1 text-xs">
                {v}
              </code>
            ))}
          </p>
          <div className="space-y-2">
            <Label htmlFor="email_subject">Subject</Label>
            <Input
              id="email_subject"
              name="email_subject"
              defaultValue={initialPage?.email_subject ?? ""}
              placeholder="Payment received — {{page_title}}"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email_body_html">HTML body</Label>
            <Textarea
              id="email_body_html"
              name="email_body_html"
              rows={10}
              defaultValue={initialPage?.email_body_html ?? ""}
              placeholder="<p>Hi {{payer_name}}, …</p>"
              className="font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 pt-6">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={initialPage?.is_active ?? true}
              className="size-4 rounded border-input text-primary"
            />
            Page is active (publicly accessible)
          </label>
          <Button type="submit" className="ml-auto">
            Save payment page
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
