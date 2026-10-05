import { prisma } from "@/lib/prisma";
import { isCalendarDay } from "@/app/api/v2/intake/_lib";
export class IntakeLogError extends Error { constructor(message: string, public code: "NOT_FOUND" | "VALIDATION") { super(message); } }
/** Web and mobile serialize toggles on the same plan row. Two toggles cancel out. */
export async function toggleIntakeLog(customerId: string, planId: string, day: string, slot: string) {
  if (!isCalendarDay(day)) throw new IntakeLogError("Некорректная дата", "VALIDATION");
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "IntakePlan" WHERE id = ${planId} AND "customerId" = ${customerId} FOR UPDATE`;
    const plan = await tx.intakePlan.findFirst({ where: { id: planId, customerId } });
    if (!plan) throw new IntakeLogError("Курс не найден", "NOT_FOUND");
    if (!plan.times.includes(slot)) throw new IntakeLogError("Такого времени приёма нет в курсе", "VALIDATION");
    const existing = await tx.intakeLog.findUnique({ where: { planId_day_slot: { planId, day, slot } } });
    if (existing) await tx.intakeLog.delete({ where: { id: existing.id } });
    else await tx.intakeLog.create({ data: { planId, day, slot } });
    return { taken: !existing, day, slot };
  });
}
