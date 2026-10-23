/**
 * Чистая доменная логика трекера: календарь курса, индекс отметок, прогресс дня
 * и стрик. Модуль-лист: тянет только типы и форматтеры, поэтому его безопасно
 * импортировать и из экранов, и из `@/lib/notifications`.
 *
 * Все даты — ЛОКАЛЬНЫЕ "YYYY-MM-DD" (`localDay`). Сравниваем строками:
 * для ISO-дат лексикографический порядок совпадает с хронологическим.
 */
import type { SFSymbol } from "expo-symbols";

import type { IntakeLog, IntakeLogRow, IntakePlan } from "@/api/types";
import { calendarDaysBetween, isScheduledDay } from "@/tracker/calendar";
import { addDays, formatDate, localDay } from "@/lib/format";

/** Формат слота, о котором договорились с вебом: строго "HH:MM", 24 часа. */
const SLOT_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Сервер формат времени не проверяет — значит проверяем мы, иначе отметки «поедут». */
export function isValidSlot(time: string): boolean {
  return SLOT_RE.test(time);
}

export function formatSlot(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function slotFromDate(date: Date): string {
  return formatSlot(date.getHours(), date.getMinutes());
}

/** Время слота на сегодняшней дате — для нативного пикера, которому нужен Date. */
export function slotToDate(time: string): Date {
  const date = new Date();
  const [hours, minutes] = time.split(":").map(Number);
  date.setHours(isValidSlot(time) ? hours : 9, isValidSlot(time) ? minutes : 0, 0, 0);
  return date;
}

/** Уникальные валидные времена по возрастанию — ровно в таком виде их ждёт API. */
export function sortSlots(times: readonly string[]): string[] {
  return Array.from(new Set(times.filter(isValidSlot))).sort((a, b) => a.localeCompare(b));
}

export type SlotPeriod = "morning" | "day" | "evening" | "night";

export function slotPeriod(time: string): SlotPeriod {
  const hour = Number(time.slice(0, 2));
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "day";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

/** Иконка и подпись времени суток. Импорт типа SFSymbol стирается при сборке. */
export const SLOT_PERIOD_ICON: Record<SlotPeriod, SFSymbol> = {
  morning: "sunrise.fill",
  day: "sun.max.fill",
  evening: "sunset.fill",
  night: "moon.fill",
};

export const SLOT_PERIOD_LABEL: Record<SlotPeriod, string> = {
  morning: "Утро",
  day: "День",
  evening: "Вечер",
  night: "Ночь",
};

/* ── Календарь курса ─────────────────────────────────────────────────────── */

function toDate(day: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date);
}

/** Разница в днях между двумя локальными датами (to - from). */
export function daysBetween(from: string, to: string): number {
  return calendarDaysBetween(from, to);
}

/** "12 сентября" из локальной даты. Через instant, чтобы не словить UTC-сдвиг. */
export function formatDayLabel(day: string): string {
  return formatDate(toDate(day).toISOString());
}

export function dayTitle(day: string, today = localDay()): string {
  if (day === today) return "Сегодня";
  if (day === addDays(today, -1)) return "Вчера";
  return formatDayLabel(day);
}

/** startDate приходит ISO-моментом — день считаем в локальной зоне пользователя. */
export function planStartDay(plan: IntakePlan): string {
  return plan.anchorDay ?? localDay(new Date(plan.startDate));
}

/** Последний день курса включительно; null — курс бессрочный. */
export function planEndDay(plan: IntakePlan): string | null {
  if (!plan.durationDays || plan.durationDays < 1) return null;
  return addDays(planStartDay(plan), plan.durationDays - 1);
}

/** Идёт ли курс в этот день (границы включительно). */
export function isPlanRunningOn(plan: IntakePlan, day: string): boolean {
  return isScheduledDay({ anchorDay: planStartDay(plan), intervalDays: plan.intervalDays ?? 1, durationDays: plan.durationDays, times: plan.times, isActive: plan.isActive }, day);
}

/** Сколько дней курса осталось, считая указанный. null — бессрочный курс. */
export function planDaysLeft(plan: IntakePlan, day = localDay()): number | null {
  const end = planEndDay(plan);
  if (end === null) return null;
  return Math.max(0, daysBetween(day, end) + 1);
}

/** Номер текущего дня курса, начиная с 1. */
export function planDayNumber(plan: IntakePlan, day = localDay()): number {
  return daysBetween(planStartDay(plan), day) + 1;
}

export type PlanDayState = "running" | "upcoming" | "finished" | "paused";

export function planDayState(plan: IntakePlan, day: string): PlanDayState {
  if (!plan.isActive) return "paused";
  if (day < planStartDay(plan)) return "upcoming";
  const end = planEndDay(plan);
  if (end !== null && day > end) return "finished";
  return "running";
}

/* ── Индекс отметок ──────────────────────────────────────────────────────── */

export type LogIndex = ReadonlySet<string>;

export function logKey(planId: string, day: string, slot: string): string {
  return `${planId}|${day}|${slot}`;
}

export function buildLogIndex(rows: readonly IntakeLogRow[]): Set<string> {
  return new Set(rows.map((row) => logKey(row.planId, row.day, row.slot)));
}

/** Логи одного курса (GET /intake/{id}/logs) → строки общего формата. */
export function withPlanId(planId: string, logs: readonly IntakeLog[]): IntakeLogRow[] {
  return logs.map((log) => ({ ...log, planId }));
}

/* ── Прогресс и стрик ────────────────────────────────────────────────────── */

export interface DayProgress {
  /** Сколько приёмов запланировано на этот день по всем активным курсам. */
  planned: number;
  /** Сколько отмечено. */
  taken: number;
}

export function dayProgress(
  plans: readonly IntakePlan[],
  index: LogIndex,
  day: string,
): DayProgress {
  let planned = 0;
  let taken = 0;
  for (const plan of plans) {
    if (planDayState(plan, day) !== "running" || !isPlanRunningOn(plan, day)) continue;
    for (const slot of plan.times) {
      if (!isValidSlot(slot)) continue;
      planned += 1;
      if (index.has(logKey(plan.id, day, slot))) taken += 1;
    }
  }
  return { planned, taken };
}

/**
 * «N дней подряд»: идём назад от сегодняшнего дня.
 *
 * Незакрытый сегодняшний день стрик НЕ обнуляет — иначе каждое утро счётчик
 * падал бы в ноль и терял смысл. День без запланированных приёмов (курс ещё не
 * начался) обрывает цепочку.
 */
export function computeStreak(
  plans: readonly IntakePlan[],
  index: LogIndex,
  today = localDay(),
  depth = 30,
): number {
  let streak = 0;
  for (let back = 0; back < depth; back += 1) {
    const day = addDays(today, -back);
    const { planned, taken } = dayProgress(plans, index, day);
    if (planned === 0) {
      if (back === 0) continue;
      break;
    }
    if (taken >= planned) {
      streak += 1;
      continue;
    }
    // сегодня ещё можно доотметить — не считаем, но и не рвём цепочку
    if (back === 0) continue;
    break;
  }
  return streak;
}

/** Семь дней, заканчивая сегодняшним. */
export function weekDays(today = localDay()): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
}

/** Глубина окна логов: хватает и на недельную полосу, и на честный стрик. */
export const LOG_WINDOW_DAYS = 30;

export function logWindow(today = localDay()): { from: string; to: string } {
  return { from: addDays(today, -(LOG_WINDOW_DAYS - 1)), to: today };
}
