import type { OrderStatus } from "@prisma/client";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: "Новая",
  CONFIRMED: "Подтверждена",
  PAID: "Оплачена",
  ASSEMBLING: "На сборке",
  SHIPPED: "Передана в доставку",
  IN_TRANSIT: "В пути",
  DELIVERED: "Доставлена",
  CANCELLED: "Отменена",
};

/** Последовательность статусов для прогресс-индикатора у клиента. */
export const ORDER_FLOW: OrderStatus[] = [
  "NEW",
  "CONFIRMED",
  "PAID",
  "ASSEMBLING",
  "SHIPPED",
  "IN_TRANSIT",
  "DELIVERED",
];

export function statusIndex(status: OrderStatus): number {
  return ORDER_FLOW.indexOf(status);
}

/** Ссылка на отслеживание по перевозчику и трек-номеру. */
export function trackingUrl(carrier: string | null | undefined, num: string): string {
  switch ((carrier || "").toLowerCase()) {
    case "cdek":
      return `https://www.cdek.ru/ru/tracking?order_id=${encodeURIComponent(num)}`;
    case "pochta":
      return `https://www.pochta.ru/tracking#${encodeURIComponent(num)}`;
    default:
      return `https://www.cdek.ru/ru/tracking?order_id=${encodeURIComponent(num)}`;
  }
}
