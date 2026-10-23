/** Civil days, independent of UTC offset/DST. Duration means calendar days, inclusive. */
export interface IntakeSchedule {
  anchorDay: string;
  intervalDays: number;
  durationDays: number | null;
  times: readonly string[];
  isActive: boolean;
}
export function isCalendarDay(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < "1900-01-01" || day > "2199-12-31") return false;
  const date = new Date(`${day}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day;
}
export function dayOrdinal(day: string): number {
  if (!isCalendarDay(day)) throw new Error("Некорректная календарная дата");
  return Date.parse(`${day}T00:00:00.000Z`) / 86_400_000;
}
export function addCalendarDays(day: string, count: number): string {
  return new Date((dayOrdinal(day) + count) * 86_400_000).toISOString().slice(0, 10);
}
export function calendarDaysBetween(from: string, to: string): number { return dayOrdinal(to) - dayOrdinal(from); }
export function endDay(plan: IntakeSchedule): string | null { return plan.durationDays === null ? null : addCalendarDays(plan.anchorDay, plan.durationDays - 1); }
export function isScheduledDay(plan: IntakeSchedule, day: string): boolean {
  if (!isCalendarDay(day) || !isCalendarDay(plan.anchorDay) || !Number.isInteger(plan.intervalDays) || plan.intervalDays < 1) return false;
  const offset = calendarDaysBetween(plan.anchorDay, day);
  return offset >= 0 && (plan.durationDays === null || offset < plan.durationDays) && offset % plan.intervalDays === 0;
}
export function isDueOn(plan: IntakeSchedule, day: string): boolean { return plan.isActive && isScheduledDay(plan, day); }
export function nextDueDays(plan: IntakeSchedule, from: string, count = 3): string[] {
  if (!plan.isActive || count < 1 || !Number.isInteger(plan.intervalDays) || plan.intervalDays < 1) return [];
  const offset = Math.max(0, calendarDaysBetween(plan.anchorDay, from));
  let index = Math.ceil(offset / plan.intervalDays) * plan.intervalDays;
  const result: string[] = [];
  while (result.length < count && (plan.durationDays === null || index < plan.durationDays)) {
    const day = addCalendarDays(plan.anchorDay, index);
    if (!isCalendarDay(day)) break;
    result.push(day); index += plan.intervalDays;
  }
  return result;
}
export function isSlot(slot: string): boolean { return /^([01]\d|2[0-3]):[0-5]\d$/.test(slot); }
