/** Форматирование под ru-RU. Деньги считаем ТОЛЬКО в копейках. */

const NBSP = " ";

/** 130000 → "1 300 ₽" (неразрывный пробел, как на сайте). */
export function formatKopecks(kopecks: number): string {
  const rub = Math.round(kopecks / 100);
  return `${rub.toLocaleString("ru-RU").replace(/\s/g, NBSP)}${NBSP}₽`;
}

/** Склонение: 1 товар / 2 товара / 5 товаров. */
export function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

/** "+7 928 677-50-50" из любого ввода; на сервер уходит именно нормализованный. */
export function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").replace(/^8/, "7").replace(/^(?!7)/, "7").slice(0, 11);
  const p = d.slice(1);
  let out = "+7";
  if (p.length) out += ` ${p.slice(0, 3)}`;
  if (p.length > 3) out += ` ${p.slice(3, 6)}`;
  if (p.length > 6) out += `-${p.slice(6, 8)}`;
  if (p.length > 8) out += `-${p.slice(8, 10)}`;
  return out;
}

/** Только цифры в формате, который принимает API: +7XXXXXXXXXX. */
export function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, "").replace(/^8/, "7");
  return d ? `+${d.slice(0, 11)}` : "";
}

export function isValidPhone(raw: string): boolean {
  return /^\+7\d{10}$/.test(normalizePhone(raw));
}

/** Локальная дата "YYYY-MM-DD" — никогда не UTC (иначе трекер сдвигается ночью). */
export function localDay(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(day: string, delta: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return localDay(dt);
}

const MONTHS = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
const WEEKDAYS = ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"];

/** "17 сентября" / "17 сентября 2025" (год добавляем, если он не текущий). */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

export function weekdayShort(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return WEEKDAYS[new Date(y, m - 1, d).getDay()];
}

/** Сегодня/вчера/дата — для истории заказов. */
export function formatDateRelative(iso: string): string {
  const day = localDay(new Date(iso));
  const today = localDay();
  if (day === today) return "сегодня";
  if (day === addDays(today, -1)) return "вчера";
  return formatDate(iso);
}

/** Грубая чистка HTML из админки — материалы приходят сырым HTML. */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&laquo;/g, "«")
    .replace(/&raquo;/g, "»")
    .replace(/&mdash;/g, "—")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
