import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import slugifyLib from "slugify";

/** Объединяет классы Tailwind, разрешая конфликты. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Копейки → строка с рублём, напр. 130000 → «1 300 ₽». */
export function formatMoney(kopecks: number): string {
  const rub = Math.round(kopecks) / 100;
  const formatted = new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: rub % 1 === 0 ? 0 : 2,
  }).format(rub);
  return `${formatted} ₽`;
}

/** Рубли (число из формы) → копейки. */
export function rubToKopecks(rub: number): number {
  return Math.round(rub * 100);
}

/** Копейки → рубли (для форм). */
export function kopecksToRub(kopecks: number): number {
  return kopecks / 100;
}

/** Транслитерация в URL-slug (кириллица → латиница). */
export function slugify(input: string): string {
  return slugifyLib(input, {
    lower: true,
    strict: true,
    locale: "ru",
    trim: true,
  });
}

/** Скидка в процентах между старой и новой ценой. */
export function discountPercent(price: number, oldPrice?: number | null): number | null {
  if (!oldPrice || oldPrice <= price) return null;
  return Math.round((1 - price / oldPrice) * 100);
}

/** Нормализация телефона в +7XXXXXXXXXX для Битрикс24. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
    return "+7" + digits.slice(1);
  }
  if (digits.length === 10) return "+7" + digits;
  return raw.trim();
}

/** Обрезка текста до n символов с многоточием. */
export function truncate(text: string, n: number): string {
  if (text.length <= n) return text;
  return text.slice(0, n - 1).trimEnd() + "…";
}
