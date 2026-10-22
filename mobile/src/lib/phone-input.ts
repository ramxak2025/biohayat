import { formatPhone } from "./format";

export const PHONE_MASK = "+7 ___ ___-__-__";

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
