// Сериализация моделей Prisma в публичные DTO API v1.

import type { Product, ProductImage, Order, OrderItem } from "@prisma/client";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";

type ProductWithFirstImage = Product & { images: ProductImage[] };

/** Карточка товара для списков (каталог, поиск, похожие). */
export function serializeProductCard(p: ProductWithFirstImage) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    shortDescription: p.shortDescription,
    priceKopecks: p.priceKopecks,
    oldPriceKopecks: p.oldPriceKopecks,
    image: p.images[0]?.url ?? null,
    badges: p.badges,
    inStock: p.inStock,
    volume: p.volume,
  };
}

export type ProductCardDto = ReturnType<typeof serializeProductCard>;

/** Заказ с позициями и человекочитаемым статусом. */
export function serializeOrder(order: Order & { items: OrderItem[] }) {
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    statusLabel: ORDER_STATUS_LABELS[order.status],
    totalKopecks: order.totalKopecks,
    discountKopecks: order.discountKopecks,
    promoCode: order.promoCode,
    address: order.address,
    comment: order.comment,
    trackingNumber: order.trackingNumber,
    trackingCarrier: order.trackingCarrier,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((it) => ({
      productId: it.productId,
      name: it.name,
      priceKopecks: it.priceKopecks,
      qty: it.qty,
    })),
  };
}
