import "server-only";
import { apiError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

/**
 * Общие правила трекера приёма БАД (`/api/v2/intake/**`).
 *
 * Трекер — ядро мобильного приложения, поэтому здесь собрана вся валидация,
 * которой раньше не было: формат времени (приложение планирует по нему локальные
 * уведомления), календарная корректность даты и вычисление «сегодня» в часовом
 * поясе клиента, а не сервера (UTC).
 */

/** Дата приёма: YYYY-MM-DD. */
export const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Время приёма: строго ЧЧ:ММ в 24-часовом формате. */
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Максимальное число времён приёма в одном курсе. */
export const MAX_TIMES = 24;
/** Максимальная ширина периода выборки логов, дней. */
export const MAX_RANGE_DAYS = 92;
/** Период по умолчанию, если from/to не переданы, дней. */
export const DEFAULT_RANGE_DAYS = 30;
/** Жёсткий предел числа отметок в одном ответе. */
export const MAX_LOGS = 5000;

/** Результат разбора пользовательского ввода: значение либо готовый ответ-ошибка. */
export type Parsed<T> = { ok: true; value: T } | { ok: false; res: ReturnType<typeof apiError> };

function bad(message: string): { ok: false; res: ReturnType<typeof apiError> } {
  return { ok: false, res: apiError(message, 400, "VALIDATION") };
}

/**
 * Проверяет, что строка — существующая календарная дата YYYY-MM-DD.
 * Регулярки мало: «2026-02-31» ей соответствует, но такого дня нет.
 */
export function isCalendarDay(value: string): boolean {
  if (!DAY_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Сегодня по UTC сервера — историческое поведение сайта (fallback). */
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Сегодняшняя дата в указанном часовом поясе IANA (напр. `Europe/Moscow`).
 * Возвращает null, если пояс неизвестен.
 */
export function dayInTimeZone(tz: string, at: Date = new Date()): string | null {
  if (!tz || tz.length > 64) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(at);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const day = `${get("year")}-${get("month")}-${get("day")}`;
    return isCalendarDay(day) ? day : null;
  } catch {
    // RangeError — несуществующий часовой пояс.
    return null;
  }
}

/** Сдвиг даты YYYY-MM-DD на delta дней. */
export function addDays(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Разница в днях между двумя датами YYYY-MM-DD (to - from). */
export function diffDays(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00.000Z`);
  const b = Date.parse(`${to}T00:00:00.000Z`);
  return Math.round((b - a) / 86_400_000);
}

/**
 * «Сегодня» глазами клиента: `?day=YYYY-MM-DD` (приоритет — клиент знает свою
 * локальную дату) либо `?tz=Europe/Moscow`. Без параметров — прежнее поведение
 * (UTC сервера), чтобы сайт продолжал работать без изменений.
 *
 * Зачем: `GET /intake` встраивает `logs` за «сегодня»; считая его по UTC, с 00:00
 * до 03:00 МСК приложение показывало вчерашние отметки.
 */
export function resolveDay(url: URL): Parsed<string> {
  const rawDay = url.searchParams.get("day");
  if (rawDay !== null) {
    const day = rawDay.trim();
    if (!isCalendarDay(day)) return bad("Некорректная дата: ожидается формат YYYY-MM-DD");
    return { ok: true, value: day };
  }

  const rawTz = url.searchParams.get("tz");
  if (rawTz !== null) {
    const day = dayInTimeZone(rawTz.trim());
    if (!day) return bad("Некорректный часовой пояс: ожидается имя IANA, например Europe/Moscow");
    return { ok: true, value: day };
  }

  return { ok: true, value: todayUtc() };
}

/**
 * Период выборки отметок: `?from=YYYY-MM-DD&to=YYYY-MM-DD`.
 * Конец по умолчанию — «сегодня» (с учётом `?day`/`?tz`), начало — на
 * DEFAULT_RANGE_DAYS назад. Ширина ограничена MAX_RANGE_DAYS.
 */
export function parseRange(
  url: URL,
  opts: { maxDays?: number; defaultDays?: number } = {},
): Parsed<{ from: string; to: string }> {
  const maxDays = opts.maxDays ?? MAX_RANGE_DAYS;
  const defaultDays = opts.defaultDays ?? DEFAULT_RANGE_DAYS;

  const anchor = resolveDay(url);
  if (!anchor.ok) return anchor;

  const rawFrom = url.searchParams.get("from")?.trim();
  const rawTo = url.searchParams.get("to")?.trim();

  const to = rawTo ? rawTo : anchor.value;
  if (!isCalendarDay(to)) return bad("Некорректная дата to: ожидается формат YYYY-MM-DD");

  const from = rawFrom ? rawFrom : addDays(to, -(defaultDays - 1));
  if (!isCalendarDay(from)) return bad("Некорректная дата from: ожидается формат YYYY-MM-DD");

  if (from > to) return bad("Начало периода позже его конца");
  if (diffDays(from, to) + 1 > maxDays) {
    return bad(`Слишком длинный период: максимум ${maxDays} дней`);
  }

  return { ok: true, value: { from, to } };
}

/**
 * Нормализует времена приёма: строго ЧЧ:ММ, без дублей, по возрастанию.
 * Возвращает null, если хоть одно значение некорректно — приложение планирует
 * по этим строкам локальные уведомления, мусор ломает расписание молча.
 */
export function normalizeTimes(raw: unknown[]): string[] | null {
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") return null;
    const value = item.trim();
    if (!TIME_RE.test(value)) return null;
    if (!out.includes(value)) out.push(value);
  }
  if (out.length === 0 || out.length > MAX_TIMES) return null;
  out.sort();
  return out;
}

/**
 * Курс текущего покупателя. Чужой или несуществующий id — одинаково `null`,
 * чтобы 404 не раскрывал факт существования чужого плана.
 */
export async function findOwnPlan(planId: string, customerId: string) {
  return prisma.intakePlan.findFirst({
    where: { id: planId, customerId },
    select: { id: true, times: true, scheduleVersion: true, intervalDays: true },
  });
}

/** Единый 404 для чужого/несуществующего курса. */
export function planNotFound() {
  return apiError("План не найден", 404, "NOT_FOUND");
}
