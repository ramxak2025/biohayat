"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/customer-auth";

/** Проверяет, что курс принадлежит текущему клиенту. Бросает ошибку, если нет. */
async function assertOwnPlan(planId: string, customerId: string): Promise<void> {
  const plan = await prisma.intakePlan.findUnique({
    where: { id: planId },
    select: { customerId: true },
  });
  if (!plan || plan.customerId !== customerId) throw new Error("FORBIDDEN");
}

export type IntakeState = { ok?: boolean; error?: string };

/** Создаёт новый курс приёма БАД. */
export async function createIntakePlan(_prev: IntakeState, fd: FormData): Promise<IntakeState> {
  const session = await requireCustomer();

  const productId = String(fd.get("productId") || "").trim() || null;
  let title = String(fd.get("title") || "").trim();

  // Если выбран товар из каталога — название берём из него.
  if (productId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { name: true },
    });
    if (!product) return { error: "Товар не найден" };
    title = product.name;
  }

  if (!title) return { error: "Укажите название курса или выберите товар" };

  // Времена приёма приходят несколькими полями times и нормализуются.
  const times = fd
    .getAll("times")
    .map((t) => String(t).trim())
    .filter(Boolean);
  if (times.length === 0) return { error: "Добавьте хотя бы одно время приёма" };

  // Длительность курса: только конечное число, ограничиваем 1..3650 дней.
  const durationParsed = Number(String(fd.get("durationDays") || "").trim());
  const durationDays = Number.isFinite(durationParsed)
    ? Math.min(3650, Math.max(1, Math.round(durationParsed)))
    : null;
  const note = String(fd.get("note") || "").trim().slice(0, 500) || null;

  await prisma.intakePlan.create({
    data: {
      customerId: session.sub,
      productId,
      title,
      times,
      durationDays,
      note,
    },
  });

  revalidatePath("/account/intake");
  return { ok: true };
}

/** Отмечает/снимает приём за день и слот (toggle по уникальному [planId,day,slot]). */
export async function toggleIntake(planId: string, day: string, slot: string): Promise<void> {
  const session = await requireCustomer();
  await assertOwnPlan(planId, session.sub);

  const existing = await prisma.intakeLog.findUnique({
    where: { planId_day_slot: { planId, day, slot } },
  });

  if (existing) {
    await prisma.intakeLog.delete({ where: { id: existing.id } });
  } else {
    await prisma.intakeLog.create({ data: { planId, day, slot } });
  }

  revalidatePath("/account/intake");
}

/** Активирует/деактивирует курс. */
export async function setPlanActive(planId: string, isActive: boolean): Promise<void> {
  const session = await requireCustomer();
  await assertOwnPlan(planId, session.sub);
  await prisma.intakePlan.update({ where: { id: planId }, data: { isActive } });
  revalidatePath("/account/intake");
}

/** Удаляет курс вместе с логами (cascade). */
export async function deleteIntakePlan(planId: string): Promise<void> {
  const session = await requireCustomer();
  await assertOwnPlan(planId, session.sub);
  await prisma.intakePlan.delete({ where: { id: planId } });
  revalidatePath("/account/intake");
}
