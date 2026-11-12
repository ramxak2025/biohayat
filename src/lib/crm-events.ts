import type { ConsultationRequest, Order, OrderItem, WholesaleAccount, WholesaleOrder, WholesaleOrderItem } from "@prisma/client";
import type { CrmEvent } from "./crm-transport";

type OrderSnapshot = Order & { items: OrderItem[] };

function orderItems(items: { productId: string | null; name: string; qty: number; priceKopecks: number }[]) {
  return items.map(item => ({
    ...(item.productId ? { productId: item.productId } : {}),
    name: item.name, qty: item.qty, priceKopecks: item.priceKopecks,
  }));
}

export function retailEvent(order: OrderSnapshot, channel: "web" | "api_v1" | "api_v2"): CrmEvent {
  const items = orderItems(order.items);
  return {
    schemaVersion: 1, kind: "retail_order", externalId: order.id, occurredAt: order.createdAt.toISOString(), channel,
    title: `Заявка №${order.number} — ${order.customerName}`,
    contact: { name: order.customerName, phone: order.phone, ...(order.email ? { email: order.email } : {}) },
    order: {
      number: String(order.number), currency: "RUB", items,
      subtotalKopecks: items.reduce((sum, item) => sum + item.qty * item.priceKopecks, 0),
      discountKopecks: order.discountKopecks, bonusSpentKopecks: order.bonusSpentKopecks,
      totalKopecks: order.totalKopecks, ...(order.promoCode ? { promoCode: order.promoCode } : {}),
    },
    details: {
      ...(order.comment ? { comment: order.comment } : {}),
      ...(order.address ? { address: order.address } : {}),
      ...(order.source ? { sourceLabel: order.source } : {}),
    },
    consent: { personalData: order.consentGiven, ...(order.consentAt ? { at: order.consentAt.toISOString() } : {}) },
  };
}

export function consultationEvent(consultation: ConsultationRequest, channel: "web" | "api_v2"): CrmEvent {
  return {
    schemaVersion: 1, kind: "consultation", externalId: consultation.id,
    occurredAt: consultation.createdAt.toISOString(), channel,
    title: `Консультация нутрициолога — ${consultation.name}`,
    contact: { name: consultation.name, phone: consultation.phone },
    details: {
      ...(consultation.topic ? { topic: consultation.topic } : {}),
      ...(consultation.message ? { comment: consultation.message } : {}),
    },
    // The consultation record does not capture a separate consent: do not invent it.
  };
}

export function wholesaleEvent(order: WholesaleOrder & { items: WholesaleOrderItem[] }, account: WholesaleAccount): CrmEvent {
  const items = orderItems(order.items);
  return {
    schemaVersion: 1, kind: "wholesale_order", externalId: order.id,
    occurredAt: order.createdAt.toISOString(), channel: "wholesale",
    title: `Оптовая заявка №${order.number} — ${account.company}`,
    contact: { name: account.name, phone: account.phone, company: account.company, ...(account.inn ? { inn: account.inn } : {}) },
    order: {
      number: String(order.number), currency: "RUB", items,
      subtotalKopecks: items.reduce((sum, item) => sum + item.qty * item.priceKopecks, 0),
      discountKopecks: 0, bonusSpentKopecks: 0, totalKopecks: order.totalKopecks,
    },
    details: { ...(order.comment ? { comment: order.comment } : {}), ...(account.city ? { address: account.city } : {}) },
  };
}
