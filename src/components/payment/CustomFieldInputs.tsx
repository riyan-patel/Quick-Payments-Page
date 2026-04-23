"use client";

import type { CustomFieldRow } from "@/types/qpp";
import { parseOptions } from "@/types/qpp";
import clsx from "clsx";

type Props = {
  fields: CustomFieldRow[];
  values: Record<string, string>;
  onChange: (fieldId: string, value: string) => void;
  errors: Record<string, string>;
  disabled?: boolean;
};

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
      <legend className="text-base font-semibold text-zinc-900 sr-only">
        Additional information
      </legend>
      {fields.map((f) => {
        const err = errors[f.id];
        const id = `field-${f.id}`;
        const helpId = f.helper_text ? `${id}-help` : undefined;
        const errId = err ? `${id}-err` : undefined;
        const describedBy = [errId, helpId].filter(Boolean).join(" ") || undefined;
        const opts = parseOptions(f.options);

        return (
          <div key={f.id} className="space-y-1">
            <label
              htmlFor={id}
              className="block text-sm font-medium text-zinc-800"
            >
              {f.label}
              {f.required ? (
                <span className="text-red-700" aria-hidden="true">
                  {" "}
                  *
                </span>
              ) : null}
              {f.required ? (
                <span className="sr-only"> (required)</span>
              ) : null}
            </label>
            {f.field_type === "text" && (
              <input
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
                className={clsx(
                  "w-full rounded-lg border px-3 py-2 text-zinc-900 shadow-sm outline-none transition",
                  "focus-visible:ring-2 focus-visible:ring-offset-2",
                  err
                    ? "border-red-600 focus-visible:ring-red-500"
                    : "border-zinc-300 focus-visible:ring-teal-600",
                )}
              />
            )}
            {f.field_type === "number" && (
              <input
                id={id}
                name={id}
                type="number"
                step="any"
                disabled={disabled}
                placeholder={f.placeholder ?? undefined}
                value={values[f.id] ?? ""}
                onChange={(e) => onChange(f.id, e.target.value)}
                aria-invalid={err ? true : undefined}
                aria-describedby={describedBy}
                className={clsx(
                  "w-full rounded-lg border px-3 py-2 text-zinc-900 shadow-sm outline-none transition",
                  "focus-visible:ring-2 focus-visible:ring-offset-2",
                  err
                    ? "border-red-600 focus-visible:ring-red-500"
                    : "border-zinc-300 focus-visible:ring-teal-600",
                )}
              />
            )}
            {f.field_type === "date" && (
              <input
                id={id}
                name={id}
                type="date"
                disabled={disabled}
                value={values[f.id] ?? ""}
                onChange={(e) => onChange(f.id, e.target.value)}
                aria-invalid={err ? true : undefined}
                aria-describedby={describedBy}
                className={clsx(
                  "w-full rounded-lg border px-3 py-2 text-zinc-900 shadow-sm outline-none transition",
                  "focus-visible:ring-2 focus-visible:ring-offset-2",
                  err
                    ? "border-red-600 focus-visible:ring-red-500"
                    : "border-zinc-300 focus-visible:ring-teal-600",
                )}
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
                className={clsx(
                  "w-full rounded-lg border bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none transition",
                  "focus-visible:ring-2 focus-visible:ring-offset-2",
                  err
                    ? "border-red-600 focus-visible:ring-red-500"
                    : "border-zinc-300 focus-visible:ring-teal-600",
                )}
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
                  className="mt-1 size-4 rounded border-zinc-300 text-teal-700 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                />
                <span id={helpId} className="text-sm text-zinc-600">
                  {f.helper_text ?? " "}
                </span>
              </div>
            )}
            {f.helper_text && f.field_type !== "checkbox" ? (
              <p id={helpId} className="text-xs text-zinc-600">
                {f.helper_text}
              </p>
            ) : null}
            {err ? (
              <p id={errId} role="alert" className="text-sm text-red-800">
                {err}
              </p>
            ) : null}
          </div>
        );
      })}
    </fieldset>
  );
}
