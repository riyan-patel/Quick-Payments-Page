import type { CustomFieldRow } from "@/types/qpp";
import { parseNumberFieldBounds, parseOptions } from "@/types/qpp";

type CustomFieldT = (key: string, values?: Record<string, string>) => string;

/**
 * @param t — typically `useTranslations("pay")` with keys under `errors.*`
 */
export function getCustomFieldValidationError(
  fields: CustomFieldRow[],
  values: Record<string, string>,
  t: CustomFieldT,
): string | null {
  for (const f of fields) {
    const raw = values[f.id] ?? "";
    const v = raw.trim();
    const label = f.label;

    if (f.required && !v) {
      return t("errors.fieldRequired", { label });
    }
    if (!v) continue;

    switch (f.field_type) {
      case "number": {
        if (!Number.isFinite(Number(v))) return t("errors.fieldNumber", { label });
        const n = Number(v);
        const { min, max } = parseNumberFieldBounds(f);
        if (min != null && n < min) {
          return t("errors.fieldNumberAtLeast", { label, min: String(min) });
        }
        if (max != null && n > max) {
          return t("errors.fieldNumberAtMost", { label, max: String(max) });
        }
        break;
      }
      case "date": {
        if (Number.isNaN(Date.parse(v))) return t("errors.fieldDate", { label });
        break;
      }
      case "dropdown": {
        const opts = parseOptions(f.options);
        if (!opts.includes(v)) return t("errors.fieldDropdown", { label });
        break;
      }
      case "checkbox": {
        if (v !== "true" && v !== "false") return t("errors.fieldCheckbox", { label });
        break;
      }
      default:
        break;
    }
  }
  return null;
}

export function validateCustomFieldResponses(
  fields: CustomFieldRow[],
  values: Record<string, string>,
): string | null {
  for (const f of fields) {
    const raw = values[f.id] ?? "";
    const v = raw.trim();

    if (f.required && !v) {
      return `“${f.label}” is required.`;
    }
    if (!v) continue;

    switch (f.field_type) {
      case "number": {
        if (!Number.isFinite(Number(v))) return `“${f.label}” must be a number.`;
        const n = Number(v);
        const { min, max } = parseNumberFieldBounds(f);
        if (min != null && n < min) {
          return max != null
            ? `“${f.label}” must be between ${min} and ${max}.`
            : `“${f.label}” must be at least ${min}.`;
        }
        if (max != null && n > max) {
          return min != null
            ? `“${f.label}” must be between ${min} and ${max}.`
            : `“${f.label}” must be at most ${max}.`;
        }
        break;
      }
      case "date": {
        if (Number.isNaN(Date.parse(v))) return `“${f.label}” must be a valid date.`;
        break;
      }
      case "dropdown": {
        const opts = parseOptions(f.options);
        if (!opts.includes(v)) return `“${f.label}” must be one of the allowed options.`;
        break;
      }
      case "checkbox": {
        if (v !== "true" && v !== "false") return `“${f.label}” is invalid.`;
        break;
      }
      default:
        break;
    }
  }
  return null;
}
