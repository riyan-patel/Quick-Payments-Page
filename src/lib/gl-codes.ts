/** GL / account codes: alphanumeric segments, common enterprise patterns allowed */
const GL_LINE = /^[A-Za-z0-9][A-Za-z0-9._\-/]{0,30}$/;

export function parseGlCodesInput(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function validateGlCodes(codes: string[]): string | null {
  if (codes.length === 0) return "Add at least one GL code.";
  for (const c of codes) {
    if (!GL_LINE.test(c)) {
      return `Invalid GL code format: "${c}". Use letters, numbers, and ._-/ (max 31 chars per segment).`;
    }
  }
  return null;
}
