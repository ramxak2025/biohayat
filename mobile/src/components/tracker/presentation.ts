import type { TrackerController, TrackerPlan } from "@/tracker/types";
import { addCalendarDays, endDay, isCalendarDay, isDueOn, isSlot, nextDueDays } from "@/tracker/calendar";
import { plural } from "@/lib/format";

export function trackerDate(day: string, year = false): string {
  if (!isCalendarDay(day)) return day;
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", ...(year ? { year: "numeric" } : {}), timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
}
export function cadenceLabel(interval: number): string {
  return interval === 1 ? "Ежедневно" : `Раз в ${interval} ${plural(interval, "день", "дня", "дней")}`;
}
export function recentTrackerDays(today: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addCalendarDays(today, index - 6));
}
export interface IntakeRowData {
  key: string; planId: string; day: string; slot: string; title: string; note: string | null;
  taken: boolean; scheduled: boolean;
}
/** Past days contain facts only. Today's schedule never rewrites old recorded times. */
export function selectedDayRows(plans: TrackerPlan[], logs: TrackerController["logs"], day: string, today: string): IntakeRowData[] {
  const rows = new Map<string, IntakeRowData>();
  const byId = new Map(plans.map((plan) => [plan.id, plan]));
  if (day === today) for (const plan of plans) {
    if (!isDueOn(plan, day)) continue;
    for (const slot of [...new Set(plan.times)].filter(isSlot)) {
      const key = `${plan.id}|${day}|${slot}`;
      rows.set(key, { key, planId: plan.id, day, slot, title: plan.title, note: plan.note, taken: false, scheduled: true });
    }
  }
  for (const log of logs) {
    if (log.day !== day) continue;
    const key = `${log.planId}|${day}|${log.slot}`;
    const existing = rows.get(key);
    const plan = byId.get(log.planId);
    rows.set(key, existing ? { ...existing, taken: true } : { key, planId: log.planId, day, slot: log.slot, title: plan?.title ?? "Курс недоступен", note: plan?.note ?? null, taken: true, scheduled: false });
  }
  return [...rows.values()].sort((a, b) => a.slot.localeCompare(b.slot) || a.title.localeCompare(b.title, "ru"));
}
export function nextTrackerDay(plans: TrackerPlan[], today: string): string | null {
  return plans.flatMap((plan) => nextDueDays(plan, addCalendarDays(today, 1), 1)).sort()[0] ?? null;
}
export function courseStatus(plan: TrackerPlan, today: string): string {
  if (!plan.isActive) return "На паузе";
  if (plan.anchorDay > today) return `Начало ${trackerDate(plan.anchorDay)}`;
  const end = endDay(plan);
  if (end && end < today) return "Курс завершён";
  return end ? `До ${trackerDate(end)}` : "Без даты окончания";
}
export const syncStateLabel = { local: "Только на устройстве", synced: "В аккаунте", queued: "Ожидает отправки", syncing: "Синхронизация", conflict: "Нужно выбрать версию" } as const;
