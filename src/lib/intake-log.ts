import { withTrackerLock } from "@/lib/tracker-service";
import { isCalendarDay } from "../../shared/intake-calendar";
export class IntakeLogError extends Error { constructor(message: string, public code: "NOT_FOUND" | "VALIDATION" | "UPGRADE_REQUIRED") { super(message); } }
/** Legacy toggles remain serialized; false cells retain revision for modern conflict detection. */
export async function toggleIntakeLog(customerId: string, planId: string, day: string, slot: string, modernWeb = false) {
  if (!isCalendarDay(day)) throw new IntakeLogError("Некорректная дата", "VALIDATION");
  return withTrackerLock(customerId, async tx => {
    const plan = await tx.intakePlan.findFirst({ where: { id: planId, customerId } });
    if (!plan) throw new IntakeLogError("Курс не найден", "NOT_FOUND");
    if (!modernWeb && (plan.scheduleVersion > 1 || plan.intervalDays !== 1)) throw new IntakeLogError("Обновите приложение для этого расписания", "UPGRADE_REQUIRED");
    if (!plan.times.includes(slot)) throw new IntakeLogError("Такого времени приёма нет в курсе", "VALIDATION");
    const key = { planId, day, slot };
    const existing = await tx.intakeLog.findUnique({ where: { planId_day_slot: key } });
    const taken = !existing?.taken;
    await tx.intakeLog.upsert({ where: { planId_day_slot: key }, create: { ...key, taken }, update: { taken, takenAt: new Date(), revision: { increment: 1 } } });
    return { taken, day, slot };
  });
}
