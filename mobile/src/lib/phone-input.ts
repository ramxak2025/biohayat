import { formatPhone } from "./format";

export const PHONE_MASK = "(___)___-__-__";

/** Input-only interpretation: subscriber digits may omit Russia's country code. */
export function normalizePhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (raw.trimStart().startsWith("+")) return `+${digits}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.length === 10) return `+7${digits}`;
  if ((digits[0] === "7" || digits[0] === "8") && digits.length <= 11) return `+7${digits.slice(1)}`;
  if (digits.length < 10) return `+7${digits}`;
  return `+${digits}`;
}

/** Never disguise foreign/overlong values as a valid Russian account number. */
export function phoneInputDisplay(value: string): string {
  if (!value || value === "+7") return "";
  return /^\+7\d{1,10}$/.test(value) ? formatPhone(value) : value;
}

/** The country code lives outside the editable subscriber field. Full-number paste stays supported. */
export function normalizePhoneSubscriberInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "+7";
  // Parenthesized input is an edit of the subscriber field, including overflow.
  // Never consume its first digit as a new country code.
  if (raw.trimStart().startsWith("(")) return `+7${digits}`;
  if (raw.trimStart().startsWith("+") || digits.startsWith("00") || digits.length > 10) {
    return normalizePhoneInput(raw);
  }
  return `+7${digits}`;
}

export function phoneSubscriberDisplay(value: string): string {
  if (!value || value === "+7") return "";
  if (!/^\+7\d+$/.test(value)) return value;
  const p = value.slice(2);
  let result = `(${p.slice(0, 3)}`;
  if (p.length > 3) result += `)${p.slice(3, 6)}`;
  if (p.length > 6) result += `-${p.slice(6, 8)}`;
  // Preserve overflow visibly and in validation; never truncate to another account.
  if (p.length > 8) result += `-${p.slice(8)}`;
  return result;
}
