"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession, requireAdmin } from "@/lib/auth";
import { syncOrderToBitrix } from "@/lib/bitrix";
import { getSettings } from "@/lib/settings";
import { accrueOrderBonus, revertOrderBonusOnCancel } from "@/lib/bonus";
import type { OrderStatus } from "@prisma/client";

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
  await requireAdmin();
  const settings = await getSettings();
  let restocked = false;
  await prisma.$transaction(async (tx) => {
    // Текущий статус читаем внутри транзакции: возврат остатков делаем только
    // на переходе НЕ-CANCELLED → CANCELLED (повторный клик ничего не вернёт).
    const order = await tx.order.findUnique({
      where: { id },
      select: { status: true, items: { select: { productId: true, qty: true } } },
    });
    if (!order) return;

    await tx.order.update({ where: { id }, data: { status } });

    // Бонусы: начисляем при доставке (однократно — по флагу bonusAccrued).
    if (status === "DELIVERED") {
      await accrueOrderBonus(tx, id, settings.bonusPercent);
    }

    if (status !== "CANCELLED" || order.status === "CANCELLED") return;

    // Бонусы: возвращаем списанные и снимаем начисленные (однократно).
    await revertOrderBonusOnCancel(tx, id);

    // Возвращаем остатки позиций отменённого заказа (только товарам
    // с включённым учётом: stockQty != null).
    for (const it of order.items) {
      if (!it.productId) continue;
      const returned = await tx.product.updateMany({
        where: { id: it.productId, stockQty: { not: null } },
        data: { stockQty: { increment: it.qty } },
      });
      if (returned.count > 0) {
        restocked = true;
        // Товар снова на складе — поднимаем флаг наличия, если был снят при нуле.
        await tx.product.updateMany({
          where: { id: it.productId, stockQty: { gt: 0 }, inStock: false },
          data: { inStock: true },
        });
      }
    }
  });
  // Остатки вернулись — сбрасываем кэш витрины (тот же тег, что в actions товаров).
  if (restocked) revalidateTag("catalog", { expire: 0 });
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
}

/** Повторная отправка заявки в Битрикс24. */
export async function resyncOrder(id: string): Promise<void> {
  await requireSession();
  await prisma.order.update({ where: { id }, data: { bitrixSyncStatus: "PENDING", bitrixError: null } });
  await syncOrderToBitrix(id);
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
