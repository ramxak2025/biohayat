"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { restoreReservedStock } from "@/lib/order-inventory";
import { prisma } from "@/lib/prisma";
import { requireSession, requireAdmin } from "@/lib/auth";
import { syncOrderToBitrix } from "@/lib/bitrix";
import { retryCrmDelivery } from "@/lib/crm-outbox";
import { getSettings } from "@/lib/settings";
import { accrueOrderBonus, revertOrderBonusOnCancel, PAID_STATUSES } from "@/lib/bonus";
import type { OrderStatus } from "@prisma/client";

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
  await requireAdmin();
  const settings = await getSettings();
  let restocked = false;
  await prisma.$transaction(async (tx) => {
    // Текущий статус читаем внутри транзакции: возврат остатков делаем только
    // на переходе НЕ-CANCELLED → CANCELLED (повторный клик ничего не вернёт).
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE`;
    const order = await tx.order.findUnique({
      where: { id },
      select: { status: true, inventoryVersion: true, items: { select: { productId: true, qty: true } } },
    });
    if (!order) return;
    if (order.status === "CANCELLED" && status !== "CANCELLED") throw new Error("Отменённый заказ нельзя возобновить. Создайте новый заказ.");

    await tx.order.update({ where: { id }, data: { status } });

    // Бонусы: начисляем при доставке (однократно — по флагу bonusAccrued).
    // Начисление — на первом «оплаченном» статусе (идемпотентно по bonusAccrued)
    if (PAID_STATUSES.includes(status)) {
      await accrueOrderBonus(tx, id, settings.bonusPercent);
    }

    if (status !== "CANCELLED" || order.status === "CANCELLED") return;

    // Бонусы: возвращаем списанные и снимаем начисленные (однократно).
    await revertOrderBonusOnCancel(tx, id);

    if (order.inventoryVersion === 1) {
      await restoreReservedStock(tx, id);
      restocked = true;
    }
    // Legacy reservations were not recorded consistently. Inventory correction
    // for historical orders remains an explicit warehouse operation.

  });
  // Остатки вернулись — сбрасываем кэш витрины (тот же тег, что в actions товаров).
  if (restocked) revalidateTag("catalog", { expire: 0 });
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
}

/** Повторная отправка заявки в Битрикс24. */
export async function resyncOrder(id: string): Promise<void> {
  await requireSession();
  const order = await prisma.order.findUniqueOrThrow({ where: { id }, select: { crmProvider: true } });
  if (order.crmProvider === "HAYAT") {
    const job = await prisma.crmOutbox.findUniqueOrThrow({ where: { kind_externalId: { kind: "retail_order", externalId: id } } });
    await retryCrmDelivery(job.id);
    revalidatePath("/admin/crm-deliveries");
  } else {
    await prisma.order.update({ where: { id }, data: { bitrixSyncStatus: "PENDING", bitrixError: null } });
    await syncOrderToBitrix(id);
  }
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
}

/** Сохраняет трек-номер доставки (СДЭК и др.). */
export async function setOrderTracking(id: string, trackingNumber: string, carrier: string): Promise<void> {
  await requireSession();
  await prisma.order.update({
    where: { id },
    data: { trackingNumber: trackingNumber.trim() || null, trackingCarrier: carrier || "cdek" },
  });
  revalidatePath(`/admin/orders/${id}`);
}

export async function deleteOrder(id: string): Promise<void> {
  await requireSession();
  await prisma.order.delete({ where: { id } });
  revalidatePath("/admin/orders");
}
