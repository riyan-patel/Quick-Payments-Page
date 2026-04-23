"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState, useEffect, useMemo, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { SavePageState } from "@/app/admin/actions";
import { savePaymentPage } from "@/app/admin/actions";
import type { AmountMode, CustomFieldRow, FieldType, PaymentPageRow } from "@/types/qpp";
import { BrandingColorPreview } from "@/components/admin/BrandingColorPreview";
import { parseBrandColorStorage } from "@/lib/brand-color-pair";
import {
  PAYER_EMAIL_TEMPLATE_DEFAULT_BODY,
  PAYER_EMAIL_TEMPLATE_DEFAULT_SUBJECT,
} from "@/lib/email-template";
import { parseOptions } from "@/types/qpp";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Braces,
  CheckCircle2,
  CircleDollarSign,
  Eye,
  Link2,
  ListTree,
  Mail,
  Palette,
} from "lucide-react";

type DraftField = {
  clientKey: string;
  id?: string;
  label: string;
  field_type: FieldType;
  optionsText: string;
  /** String form for number min/max; empty means no bound. */
  min_value: string;
  max_value: string;
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

const inputSm = cn(
  "h-8 min-h-8 rounded-lg border border-input bg-background px-2.5 py-1 text-[0.8125rem] outline-none",
  "transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
);

/** Matches shadcn Input / Textarea — consistent with the rest of the app. */
const formField = cn(
  "h-10 min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm",
  "transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
  "placeholder:text-muted-foreground",
);
const formTextarea = cn(
  "min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm leading-relaxed",
  "transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
  "placeholder:text-muted-foreground",
);

const selectSm = cn(
  inputSm,
  "w-full",
);

const editorCardShell = cn(
  "overflow-hidden rounded-2xl border border-border/60 bg-card",
  "shadow-sm ring-1 ring-foreground/[0.04] transition-shadow",
);

const editorCardGrid = cn(editorCardShell, "flex h-full min-h-0 flex-col");

function SectionIcon({ children }: { children: ReactNode }) {
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      {children}
    </div>
  );
}

function newKey() {
  return `k-${Math.random().toString(36).slice(2, 10)}`;
}

function EditorSubmitButton() {
  const t = useTranslations("editor");
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className="w-full rounded-full px-6 font-semibold shadow-sm sm:w-auto"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? t("saving") : t("save")}
    </Button>
  );
}

export function PageEditorForm({
  initialPage,
  initialFields,
  showSaveSuccess = false,
}: {
  initialPage?: PaymentPageRow;
  initialFields?: CustomFieldRow[];
  /** Set when returning from a successful save (`?saved=1`). */
  showSaveSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(savePaymentPage, {} as SavePageState);

  useEffect(() => {
    if (!showSaveSuccess) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("saved") !== "1") return;
    url.searchParams.delete("saved");
    const q = url.searchParams.toString();
    window.history.replaceState(null, "", `${url.pathname}${q ? `?${q}` : ""}${url.hash}`);
  }, [showSaveSuccess]);

  const [amountMode, setAmountMode] = useState<AmountMode>(
    initialPage?.amount_mode ?? "fixed",
  );

  const initialPalette = parseBrandColorStorage(
    initialPage?.brand_color,
    initialPage?.brand_color_secondary,
  );
  const [brandColor, setBrandColor] = useState(initialPalette.primary);
  const [brandColorSecondary, setBrandColorSecondary] = useState(initialPalette.secondary);

  const locale = useLocale();
  const t = useTranslations("editor");

  const payerEmailSubjectDefault =
    initialPage?.email_subject?.trim() || PAYER_EMAIL_TEMPLATE_DEFAULT_SUBJECT;
  const payerEmailBodyDefault =
    initialPage?.email_body_html?.trim() || PAYER_EMAIL_TEMPLATE_DEFAULT_BODY;

  const [fields, setFields] = useState<DraftField[]>(() => {
    if (initialFields?.length) {
      return initialFields.map((f) => ({
        clientKey: f.id,
        id: f.id,
        label: f.label,
        field_type: f.field_type,
        optionsText: parseOptions(f.options).join(", "),
        min_value:
          f.field_type === "number" && f.min_value != null && String(f.min_value).trim() !== ""
            ? String(f.min_value)
            : "",
        max_value:
          f.field_type === "number" && f.max_value != null && String(f.max_value).trim() !== ""
            ? String(f.max_value)
            : "",
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
        fields.map((f, i) => {
          const numMin =
            f.field_type === "number" && f.min_value.trim() !== ""
              ? Number(f.min_value.trim())
              : null;
          const numMax =
            f.field_type === "number" && f.max_value.trim() !== ""
              ? Number(f.max_value.trim())
              : null;
          return {
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
            min_value:
              f.field_type === "number" && numMin != null && Number.isFinite(numMin) ? numMin : null,
            max_value:
              f.field_type === "number" && numMax != null && Number.isFinite(numMax) ? numMax : null,
          };
        }),
      ),
    [fields],
  );

  const addField = () => {
    if (fields.length >= 10) return;
    setFields((prev) => [
      ...prev,
      {
        clientKey: newKey(),
        label: t("newFieldDefault"),
        field_type: "text",
        optionsText: "",
        min_value: "",
        max_value: "",
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
    <form id="qpp-page-editor" action={formAction} className="w-full max-w-none space-y-6 pb-20">
      {initialPage?.id ? <input type="hidden" name="id" value={initialPage.id} /> : null}
      <input type="hidden" name="locale" value={locale} readOnly />
      <input type="hidden" name="fields_json" value={fieldsJson} />
      <input type="hidden" name="brand_color" value={brandColor} />
      <input type="hidden" name="brand_color_secondary" value={brandColorSecondary} />

      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {showSaveSuccess ? (
        <Alert
          className="border-emerald-200/90 bg-emerald-50/95 text-emerald-950 dark:border-emerald-800/80 dark:bg-emerald-950/45 dark:text-emerald-50"
          role="status"
        >
          <CheckCircle2
            className="size-4 text-emerald-600 dark:text-emerald-400"
            strokeWidth={1.75}
            aria-hidden
          />
          <AlertDescription className="text-emerald-900 dark:text-emerald-100 [&_a]:text-emerald-800 dark:[&_a]:text-emerald-200">
            {t("saveSuccess")}
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className={editorCardShell}>
        <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
          <div className="flex items-start gap-3">
            <SectionIcon>
              <Eye className="size-4" strokeWidth={1.5} aria-hidden />
            </SectionIcon>
            <div className="min-w-0 space-y-0.5">
              <CardTitle className="text-lg font-semibold tracking-tight">{t("publicAccessTitle")}</CardTitle>
              <CardDescription>{t("publicAccessDesc")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={initialPage?.is_active ?? true}
              className="mt-0.5 size-4 rounded border-input text-primary focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span>
              <span className="block font-medium">{t("isActive")}</span>
              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                {t("isActiveHelp")}
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
        <Card className={editorCardGrid}>
          <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
            <div className="flex items-start gap-3">
              <SectionIcon>
                <Link2 className="size-4" strokeWidth={1.5} aria-hidden />
              </SectionIcon>
              <div className="min-w-0 space-y-0.5">
                <CardTitle className="text-lg font-semibold tracking-tight">{t("pageUrlTitle")}</CardTitle>
                <CardDescription>{t("pageUrlDesc")}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid flex-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="slug">{t("urlSlug")}</Label>
              <Input
                id="slug"
                name="slug"
                required
                defaultValue={initialPage?.slug}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                title={t("slugInputTitle")}
                placeholder={t("slugPlaceholder")}
                aria-describedby="slug-help"
                className={formField}
              />
              <p id="slug-help" className="text-xs text-muted-foreground">
                {t("slugHelp")}
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">{t("title")}</Label>
              <Input
                id="title"
                name="title"
                required
                defaultValue={initialPage?.title}
                className={formField}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="subtitle">{t("subtitle")}</Label>
              <Textarea
                id="subtitle"
                name="subtitle"
                rows={2}
                defaultValue={initialPage?.subtitle ?? ""}
                className={formTextarea}
              />
            </div>
          </CardContent>
        </Card>

        <Card className={editorCardGrid}>
          <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
            <div className="flex items-start gap-3">
              <SectionIcon>
                <CircleDollarSign className="size-4" strokeWidth={1.5} aria-hidden />
              </SectionIcon>
              <div className="min-w-0 space-y-0.5">
                <CardTitle className="text-lg font-semibold tracking-tight">{t("amountTitle")}</CardTitle>
                <CardDescription>{t("amountDesc")}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col space-y-4">
            <fieldset className="space-y-2 border-0 p-0">
              <legend className="text-sm font-medium">{t("amountMode")}</legend>
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
                  {m === "fixed" && t("modeFixed")}
                  {m === "range" && t("modeRange")}
                  {m === "open" && t("modeOpen")}
                </label>
              ))}
            </fieldset>
            {amountMode === "fixed" ? (
              <div className="space-y-2">
                <Label htmlFor="fixed_amount">{t("fixedAmount")}</Label>
                <Input
                  id="fixed_amount"
                  name="fixed_amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  defaultValue={initialPage?.fixed_amount ?? ""}
                  className={cn(formField, "max-w-xs")}
                />
              </div>
            ) : null}
            {amountMode === "range" ? (
              <div className="flex flex-wrap gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min_amount">{t("minAmount")}</Label>
                  <Input
                    id="min_amount"
                    name="min_amount"
                    type="number"
                    step="0.01"
                    defaultValue={initialPage?.min_amount ?? ""}
                    className={cn(formField, "max-w-[10rem]")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_amount">{t("maxAmount")}</Label>
                  <Input
                    id="max_amount"
                    name="max_amount"
                    type="number"
                    step="0.01"
                    defaultValue={initialPage?.max_amount ?? ""}
                    className={cn(formField, "max-w-[10rem]")}
                  />
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className={editorCardShell}>
        <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
          <div className="flex items-start gap-3">
            <SectionIcon>
              <Palette className="size-4" strokeWidth={1.5} aria-hidden />
            </SectionIcon>
            <div className="min-w-0 space-y-0.5">
              <CardTitle className="text-lg font-semibold tracking-tight">{t("brandingTitle")}</CardTitle>
              <CardDescription>{t("brandingDesc")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
            <div className="flex min-h-0 flex-col space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="logo_url">{t("logoUrl")}</Label>
                  <Input
                    id="logo_url"
                    name="logo_url"
                    type="text"
                    inputMode="url"
                    defaultValue={initialPage?.logo_url ?? ""}
                    placeholder={t("logoPlaceholder")}
                    className={formField}
                  />
                </div>
                <div className="space-y-2">
                  <span id="brand-color-label" className="text-sm font-medium">
                    {t("primaryColor")}
                  </span>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="h-10 w-14 cursor-pointer overflow-hidden rounded-lg border border-input bg-background shadow-sm"
                      aria-labelledby="brand-color-label"
                    />
                    <span className="font-mono text-sm text-muted-foreground" aria-live="polite">
                      {brandColor}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <span id="brand-color-secondary-label" className="text-sm font-medium">
                    {t("secondaryColor")}
                  </span>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="color"
                      value={brandColorSecondary}
                      onChange={(e) => setBrandColorSecondary(e.target.value)}
                      className="h-10 w-14 cursor-pointer overflow-hidden rounded-lg border border-input bg-background shadow-sm"
                      aria-labelledby="brand-color-secondary-label"
                    />
                    <span className="font-mono text-sm text-muted-foreground" aria-live="polite">
                      {brandColorSecondary}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="header_message">{t("headerMessage")}</Label>
                <Textarea
                  id="header_message"
                  name="header_message"
                  rows={2}
                  defaultValue={initialPage?.header_message ?? ""}
                  className={formTextarea}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trust_panel">{t("trustPanel")}</Label>
                <Textarea
                  id="trust_panel"
                  name="trust_panel"
                  rows={4}
                  defaultValue={initialPage?.trust_panel ?? ""}
                  placeholder={t("trustPlaceholder")}
                  className={formTextarea}
                />
              </div>
            </div>
            <div className="flex min-h-0 flex-col space-y-4">
              <BrandingColorPreview primary={brandColor} secondary={brandColorSecondary} />
              <p className="mt-auto text-xs leading-relaxed text-muted-foreground">
                {t("colorHelp")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={editorCardShell}>
        <CardHeader className="space-y-0 border-b border-border/50 bg-muted/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <SectionIcon>
                <ListTree className="size-4" strokeWidth={1.5} aria-hidden />
              </SectionIcon>
              <div className="min-w-0 space-y-0.5">
                <CardTitle className="text-lg font-semibold tracking-tight">{t("customTitle")}</CardTitle>
                <CardDescription>{t("customDesc")}</CardDescription>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addField}
              disabled={fields.length >= 10}
              className="shrink-0 rounded-full border-foreground/12 shadow-sm"
            >
              {t("addField")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/80 bg-muted/25 px-4 py-6 text-center text-sm text-muted-foreground">
              {t("emptyCustom")}
            </p>
          ) : (
            <ul className="space-y-4">
              {fields.map((f, idx) => (
                <li key={f.clientKey}>
                  <Card className="border border-border/50 bg-muted/20 shadow-sm ring-0">
                    <CardContent className="space-y-3 pt-4">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          aria-label={t("moveFieldUp", { n: idx + 1 })}
                          onClick={() => move(idx, -1)}
                        >
                          {t("up")}
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          aria-label={t("moveFieldDown", { n: idx + 1 })}
                          onClick={() => move(idx, 1)}
                        >
                          {t("down")}
                        </Button>
                        <Button type="button" size="xs" variant="destructive" onClick={() => remove(idx)}>
                          {t("remove")}
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">{t("fieldLabel")}</label>
                          <Input
                            value={f.label}
                            onChange={(e) => update(idx, { label: e.target.value })}
                            className={inputSm}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">{t("fieldType")}</label>
                          <select
                            value={f.field_type}
                            onChange={(e) =>
                              update(idx, { field_type: e.target.value as FieldType })
                            }
                            className={selectSm}
                          >
                            <option value="text">{t("typeText")}</option>
                            <option value="number">{t("typeNumber")}</option>
                            <option value="dropdown">{t("typeDropdown")}</option>
                            <option value="date">{t("typeDate")}</option>
                            <option value="checkbox">{t("typeCheckbox")}</option>
                          </select>
                        </div>
                        {f.field_type === "dropdown" ? (
                          <div className="space-y-1 sm:col-span-2">
                            <label className="text-xs font-medium text-muted-foreground">
                              {t("fieldOptions")}
                            </label>
                            <Input
                              value={f.optionsText}
                              onChange={(e) => update(idx, { optionsText: e.target.value })}
                              className={inputSm}
                              placeholder={t("optionsPlaceholder")}
                            />
                          </div>
                        ) : null}
                        {f.field_type === "number" ? (
                          <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-muted-foreground">
                                {t("fieldMin")}
                              </label>
                              <Input
                                value={f.min_value}
                                onChange={(e) => update(idx, { min_value: e.target.value })}
                                className={inputSm}
                                type="number"
                                step="any"
                                placeholder="—"
                                autoComplete="off"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-muted-foreground">
                                {t("fieldMax")}
                              </label>
                              <Input
                                value={f.max_value}
                                onChange={(e) => update(idx, { max_value: e.target.value })}
                                className={inputSm}
                                type="number"
                                step="any"
                                placeholder="—"
                                autoComplete="off"
                              />
                            </div>
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
                            {t("required")}
                          </Label>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">{t("placeholder")}</label>
                          <Input
                            value={f.placeholder}
                            onChange={(e) => update(idx, { placeholder: e.target.value })}
                            className={inputSm}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">{t("helperText")}</label>
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

      <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
        <Card className={editorCardGrid}>
          <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
            <div className="flex items-start gap-3">
              <SectionIcon>
                <Braces className="size-4" strokeWidth={1.5} aria-hidden />
              </SectionIcon>
              <div className="min-w-0 space-y-0.5">
                <CardTitle className="text-lg font-semibold tracking-tight">{t("glTitle")}</CardTitle>
                <CardDescription>{t("glDesc")}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col space-y-2">
            <Label htmlFor="gl_codes_raw">{t("glLabel")}</Label>
            <Textarea
              id="gl_codes_raw"
              name="gl_codes_raw"
              rows={3}
              required
              defaultValue={(initialPage?.gl_codes ?? []).join(", ")}
              placeholder="REV-YOGA-01, CITY-PARK-2025"
              className={cn(formTextarea, "font-mono text-sm")}
            />
            <p className="text-xs text-muted-foreground">
              {t("glHelp")}
            </p>
          </CardContent>
        </Card>

        <Card className={editorCardGrid}>
          <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
            <div className="flex items-start gap-3">
              <SectionIcon>
                <Mail className="size-4" strokeWidth={1.5} aria-hidden />
              </SectionIcon>
              <div className="min-w-0 space-y-0.5">
                <CardTitle className="text-lg font-semibold tracking-tight">
                  {t("emailTitle")}
                </CardTitle>
                <CardDescription>{t("emailDesc")}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("emailVars")}{" "}
              {VARIABLES.map((v) => (
                <code key={v} className="mr-1 rounded bg-muted px-1 text-xs">
                  {v}
                </code>
              ))}
            </p>
            <div className="space-y-2">
              <Label htmlFor="email_subject">{t("emailSubject")}</Label>
              <Input
                id="email_subject"
                name="email_subject"
                defaultValue={payerEmailSubjectDefault}
                placeholder="Payment received — {{page_title}}"
                className={formField}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email_body_html">{t("emailBody")}</Label>
              <Textarea
                id="email_body_html"
                name="email_body_html"
                rows={10}
                defaultValue={payerEmailBodyDefault}
                placeholder="<p>Hi {{payer_name}}, …</p>"
                className={cn(formTextarea, "min-h-48 font-mono text-sm")}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card
        className={cn(
          editorCardShell,
          "border-primary/15 bg-primary/[0.03] ring-primary/10",
        )}
      >
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-end">
          <EditorSubmitButton />
        </CardContent>
      </Card>
    </form>
  );
}
