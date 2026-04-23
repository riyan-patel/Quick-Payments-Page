"use client";

import type { CustomFieldRow } from "@/types/qpp";
import { parseNumberFieldBounds, parseOptions } from "@/types/qpp";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  fields: CustomFieldRow[];
  values: Record<string, string>;
  onChange: (fieldId: string, value: string) => void;
  errors: Record<string, string>;
  disabled?: boolean;
};

const customFieldInputBase = cn(
  "h-12 rounded-2xl border border-border/80 bg-input px-4 text-foreground",
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
);

const selectClassName = cn(
  "flex h-12 w-full rounded-2xl border border-border/80 bg-input px-4 py-2 text-sm text-foreground",
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
  "transition-colors outline-none",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
);

export function CustomFieldInputs({
  fields,
  values,
  onChange,
  errors,
  disabled,
}: Props) {
  if (fields.length === 0) return null;

  return (
    <fieldset className="space-y-4 border-0 p-0">
      <legend className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <ListChecks className="size-3.5 text-foreground/50" strokeWidth={1.75} aria-hidden />
        Additional information
      </legend>
      {fields.map((f) => {
        const err = errors[f.id];
        const id = `field-${f.id}`;
        const helpId = f.helper_text ? `${id}-help` : undefined;
        const errId = err ? `${id}-err` : undefined;
        const describedBy = [errId, helpId].filter(Boolean).join(" ") || undefined;
        const opts = parseOptions(f.options);
        const numBounds = parseNumberFieldBounds(f);

        return (
          <div key={f.id} className="space-y-2">
            <Label htmlFor={id}>
              {f.label}
              {f.required ? (
                <span className="text-destructive" aria-hidden="true">
                  {" "}
                  *
                </span>
              ) : null}
              {f.required ? <span className="sr-only"> (required)</span> : null}
            </Label>
            {f.field_type === "text" && (
              <Input
                id={id}
                name={id}
                type="text"
                disabled={disabled}
                placeholder={f.placeholder ?? undefined}
                autoComplete="off"
                value={values[f.id] ?? ""}
                onChange={(e) => onChange(f.id, e.target.value)}
                aria-invalid={err ? true : undefined}
                aria-describedby={describedBy}
                className={cn(customFieldInputBase, err && "border-destructive")}
              />
            )}
            {f.field_type === "number" && (
              <Input
                id={id}
                name={id}
                type="number"
                step="any"
                min={numBounds.min ?? undefined}
                max={numBounds.max ?? undefined}
                disabled={disabled}
                placeholder={f.placeholder ?? undefined}
                value={values[f.id] ?? ""}
                onChange={(e) => onChange(f.id, e.target.value)}
                aria-invalid={err ? true : undefined}
                aria-describedby={describedBy}
                className={cn(customFieldInputBase, err && "border-destructive")}
              />
            )}
            {f.field_type === "date" && (
              <Input
                id={id}
                name={id}
                type="date"
                disabled={disabled}
                value={values[f.id] ?? ""}
                onChange={(e) => onChange(f.id, e.target.value)}
                aria-invalid={err ? true : undefined}
                aria-describedby={describedBy}
                className={cn(customFieldInputBase, err && "border-destructive")}
              />
            )}
            {f.field_type === "dropdown" && (
              <select
                id={id}
                name={id}
                disabled={disabled}
                value={values[f.id] ?? ""}
                onChange={(e) => onChange(f.id, e.target.value)}
                aria-invalid={err ? true : undefined}
                aria-describedby={describedBy}
                className={cn(selectClassName, err && "border-destructive")}
              >
                <option value="">Select…</option>
                {opts.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            )}
            {f.field_type === "checkbox" && (
              <div className="flex items-start gap-2">
                <input
                  id={id}
                  name={id}
                  type="checkbox"
                  disabled={disabled}
                  checked={values[f.id] === "true"}
                  onChange={(e) => onChange(f.id, e.target.checked ? "true" : "false")}
                  aria-invalid={err ? true : undefined}
                  aria-describedby={describedBy}
                  className="mt-1 size-4 rounded border-input text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <span id={helpId} className="text-sm text-muted-foreground">
                  {f.helper_text ?? " "}
                </span>
              </div>
            )}
            {f.helper_text && f.field_type !== "checkbox" ? (
              <p id={helpId} className="text-xs text-muted-foreground">
                {f.helper_text}
              </p>
            ) : null}
            {err ? (
              <p id={errId} role="alert" className="text-sm text-destructive">
                {err}
              </p>
            ) : null}
          </div>
        );
      })}
    </fieldset>
  );
}
