import type { CustomFieldRow } from "@/types/qpp";
import { parseOptions } from "@/types/qpp";

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
