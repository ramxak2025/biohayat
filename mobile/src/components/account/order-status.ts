import type { SFSymbol } from "expo-symbols";

import { ORDER_FLOW, ORDER_STATUS_LABELS, type Order, type OrderStatus } from "@/api/types";
import type { BadgeTone } from "@/components/ui";

/** Цвет бейджа статуса. Отмена — красная, доставлен — зелёный, остальное — по стадии. */
export const ORDER_STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  NEW: "neutral",
  CONFIRMED: "accent",
  PAID: "accent",
  ASSEMBLING: "accent",
  SHIPPED: "brand",
  IN_TRANSIT: "brand",
  DELIVERED: "success",
  CANCELLED: "danger",
};

export const ORDER_STATUS_ICON: Record<OrderStatus, SFSymbol> = {
  NEW: "doc.text",
  CONFIRMED: "checkmark.seal",
  PAID: "creditcard",
  ASSEMBLING: "shippingbox",
  SHIPPED: "shippingbox.fill",
  IN_TRANSIT: "box.truck",
  DELIVERED: "checkmark.circle.fill",
  CANCELLED: "xmark.circle.fill",
};

/** Позиция в цепочке ORDER_FLOW; −1 для отменённого заказа. */
export function orderStepIndex(status: OrderStatus): number {
  return ORDER_FLOW.indexOf(status);
}

/** Сервер присылает готовую подпись; локальная таблица — страховка для офлайна. */
export function orderStatusLabel(order: Pick<Order, "status" | "statusLabel">): string {
  return order.statusLabel || ORDER_STATUS_LABELS[order.status];
}

/** Отмена на сервере разрешена, пока заказ не ушёл в сборку. */
export function canCancelOrder(status: OrderStatus): boolean {
  return status === "NEW" || status === "CONFIRMED";
}
