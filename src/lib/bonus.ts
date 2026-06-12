import type { Prisma } from "@prisma/client";

/**
 * Бонусные баллы (1 балл = 1 копейка): начисление за доставленный заказ
 * и возврат/сторнирование при отмене. Вызываются из админских actions заказов
 * и из приёмника вебхуков Битрикс24 — всегда внутри prisma.$transaction.
 *
 * Идемпотентность обеспечивается атомарными updateMany по флагам заказа
 * (bonusAccrued / bonusSpentKopecks), поэтому повторные вызовы и гонки безопасны.
 */
type Tx = Prisma.TransactionClient;

/**
 * Начисляет bonusPercent% от суммы заказа при доставке. Однократно:
 * флаг bonusAccrued «занимается» атомарным updateMany.
 */
export async function accrueOrderBonus(tx: Tx, orderId: string, bonusPercent: number): Promise<void> {
  if (bonusPercent <= 0) return;

  const claimed = await tx.order.updateMany({
    where: { id: orderId, bonusAccrued: false, customerId: { not: null } },
    data: { bonusAccrued: true },
  });
  if (claimed.count === 0) return;

  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: { customerId: true, totalKopecks: true },
  });
  if (!order?.customerId) return;

  const amount = Math.round((order.totalKopecks * bonusPercent) / 100);
  if (amount <= 0) return;

  await tx.customer.update({
    where: { id: order.customerId },
    data: { bonusKopecks: { increment: amount } },
  });
  await tx.bonusTransaction.create({
    data: { customerId: order.customerId, amountKopecks: amount, reason: "order", orderId },
  });
}

/**
 * Возврат бонусов при отмене заказа:
 *  1) списанные при оформлении баллы возвращаются на баланс;
 *  2) начисленные за заказ баллы снимаются обратно (не уводя баланс ниже нуля).
 * Однократность: после возврата bonusSpentKopecks=0 и bonusAccrued=false,
 * повторный вызов — no-op.
 */
export async function revertOrderBonusOnCancel(tx: Tx, orderId: string): Promise<void> {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: { customerId: true, bonusSpentKopecks: true, bonusAccrued: true },
  });
  if (!order || (order.bonusSpentKopecks <= 0 && !order.bonusAccrued)) return;

  // Атомарно «занимаем» возврат: сбрасываем флаги при условии прежних значений —
  // параллельный вызов получит count === 0 и ничего не сделает.
  const claimed = await tx.order.updateMany({
    where: {
      id: orderId,
      bonusSpentKopecks: order.bonusSpentKopecks,
      bonusAccrued: order.bonusAccrued,
    },
    data: { bonusSpentKopecks: 0, bonusAccrued: false },
  });
  if (claimed.count === 0 || !order.customerId) return;

  // 1) Возвращаем списанные при оформлении баллы.
  if (order.bonusSpentKopecks > 0) {
    await tx.customer.update({
      where: { id: order.customerId },
      data: { bonusKopecks: { increment: order.bonusSpentKopecks } },
    });
    await tx.bonusTransaction.create({
      data: {
        customerId: order.customerId,
        amountKopecks: order.bonusSpentKopecks,
        reason: "manual",
        orderId,
        note: "Возврат за отменённый заказ",
      },
    });
  }

  // 2) Снимаем начисленные за заказ баллы (точную сумму берём из истории операций).
  if (order.bonusAccrued) {
    const accrual = await tx.bonusTransaction.findFirst({
      where: { orderId, reason: "order" },
      orderBy: { createdAt: "desc" },
      select: { amountKopecks: true },
    });
    const accrued = accrual?.amountKopecks ?? 0;
    if (accrued <= 0) return;

    const customer = await tx.customer.findUnique({
      where: { id: order.customerId },
      select: { bonusKopecks: true },
    });
    // Clamp: не уводим баланс ниже нуля (часть баллов могла быть уже потрачена).
    const debit = Math.min(accrued, Math.max(0, customer?.bonusKopecks ?? 0));
    if (debit <= 0) return;

    const debited = await tx.customer.updateMany({
      where: { id: order.customerId, bonusKopecks: { gte: debit } },
      data: { bonusKopecks: { decrement: debit } },
    });
    if (debited.count === 0) return;

    await tx.bonusTransaction.create({
      data: {
        customerId: order.customerId,
        amountKopecks: -debit,
        reason: "manual",
        orderId,
        note: "Возврат начисления за отменённый заказ",
      },
    });
  }
}
