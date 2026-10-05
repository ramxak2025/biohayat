import { restoreReservedStock } from "@/lib/order-inventory";
import { revalidateTag } from "next/cache";
import { revertOrderBonusOnCancel } from "@/lib/bonus";
import { apiOk, apiError, apiInternal, apiPreflight } from "@/lib/api/response";
import { getApiCustomer } from "@/lib/api/token";
import { prisma } from "@/lib/prisma";
import { serializeOrder } from "@/lib/api/serializers";
import type { OrderStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

/** Пока заказ не взят в работу складом, покупатель может отменить его сам. */
const CANCELLABLE: OrderStatus[] = ["NEW", "CONFIRMED"];

/**
 * POST /api/v2/orders/[number]/cancel — отмена собственного заказа.
 *
 * ВАЖНО (односторонняя синхронизация): в Битрикс24 уходит только создание лида
 * (`syncOrderToBitrix`), обратного вызова «отменить лид» в интеграции нет.
 * Поэтому отмена здесь меняет статус в нашей БД, но менеджер увидит её только
 * в админке; и если он потом переведёт лид в другую стадию, входящий вебхук
 * (`/api/bitrix/webhook`) перезапишет статус заказа. Отсюда и узкое окно
 * NEW/CONFIRMED — дальше отмену обязан подтверждать менеджер.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ number: string }> },
) {
  try {
    const session = await getApiCustomer(req);
    if (!session) return apiError("Требуется авторизация", 401, "UNAUTHORIZED");

    const { number } = await params;
    const orderNumber = Number(number);
    if (!Number.isInteger(orderNumber)) {
      return apiError("Заказ не найден", 404, "NOT_FOUND");
    }

    // Как и в GET: чужой заказ неотличим от несуществующего.
    const order = await prisma.order.findFirst({
      where: { number: orderNumber, customerId: session.sub },
      select: { id: true, status: true, inventoryVersion: true },
    });
    if (!order) {
      return apiError("Заказ не найден", 404, "NOT_FOUND");
    }

    if (order.inventoryVersion === 0) return apiError("Для отмены заказа, оформленного в предыдущей версии, свяжитесь с менеджером.", 409, "LEGACY_ORDER");
    if (order.status === "CANCELLED") {
      return apiError("Заказ уже отменён", 409, "VALIDATION");
    }
    if (!CANCELLABLE.includes(order.status)) {
      return apiError(
        "Заказ уже в работе — отмену подтверждает менеджер, позвоните нам",
        409,
        "VALIDATION",
      );
    }

    const updated = await prisma.$transaction(async tx => {
      const claim = await tx.order.updateMany({ where: { id: order.id, status: { in: CANCELLABLE } }, data: { status: "CANCELLED" } });
      if (!claim.count) return null;
      await revertOrderBonusOnCancel(tx, order.id);
      const current = await tx.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true } });
      await restoreReservedStock(tx, order.id);
      return current;
    });
    if (!updated) return apiError("Статус заказа изменился. Обновите страницу.", 409, "CONFLICT");
    revalidateTag("catalog", { expire: 0 });

    return apiOk(serializeOrder(updated));
  } catch (e) {
    return apiInternal("api/v2/orders/[number]/cancel POST", e);
  }
}
