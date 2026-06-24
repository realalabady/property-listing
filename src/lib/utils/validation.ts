/**
 * Client-side validation + display helpers for data-entry forms.
 *
 * These are an extra UX gate on top of server-side validation — they never
 * replace it. Saudi phone normalization produces a canonical value the
 * existing server rules still accept.
 */

/**
 * Normalize a Saudi mobile number to canonical `+9665XXXXXXXX`.
 * Accepts: `05XXXXXXXX`, `5XXXXXXXX`, `9665XXXXXXXX`, `+9665XXXXXXXX`
 * (with arbitrary spaces/dashes). Returns "" if it isn't a valid Saudi mobile.
 */
export function normalizeSaudiPhone(raw: string): string {
  const digits = (raw ?? "").replace(/[\s\-()]/g, "");
  let local: string | null = null;

  if (/^\+9665\d{8}$/.test(digits)) {
    local = digits.slice(4); // drop +966
  } else if (/^9665\d{8}$/.test(digits)) {
    local = digits.slice(3); // drop 966
  } else if (/^05\d{8}$/.test(digits)) {
    local = digits.slice(1); // drop leading 0
  } else if (/^5\d{8}$/.test(digits)) {
    local = digits;
  }

  return local ? `+966${local}` : "";
}

export function isValidSaudiPhone(raw: string): boolean {
  return normalizeSaudiPhone(raw) !== "";
}

/** Saudi national ID / Iqama: exactly 10 digits. */
export function isValidNationalId(raw: string): boolean {
  return /^\d{10}$/.test((raw ?? "").trim());
}

/**
 * Mask a sensitive value for table display, keeping the last `visibleDigits`.
 * e.g. maskSensitive("1234567890") -> "••••••7890".
 */
export function maskSensitive(value: string, visibleDigits = 4): string {
  const v = (value ?? "").trim();
  if (!v) return "";
  if (v.length <= visibleDigits) return "•".repeat(v.length);
  return "•".repeat(v.length - visibleDigits) + v.slice(-visibleDigits);
}
