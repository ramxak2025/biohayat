import { uuid } from "expo-modules-core";
import { api } from "@/api/endpoints";
import { ApiError } from "@/api/client";
import { sessionGeneration } from "@/lib/session-generation";
import { useCart, type CartLine } from "@/store/cart";
import type { CreateOrderBody } from "@/api/types";

type Contact = Omit<CreateOrderBody, "requestKey" | "expectedTotalKopecks" | "items">;
/** Retain the request identity for an uncertain network result, including retries. */
export function createCheckoutRequest() {
  let pending: { signature: string; body: CreateOrderBody } | undefined;
  let inFlight = false;
  const execute = async (contact: Contact, snapshot: readonly CartLine[]) => {
    const epoch = sessionGeneration();
    const signature = JSON.stringify({ contact, items: snapshot.map(l => ({ id: l.id, qty: l.qty, price: l.priceKopecks })), epoch });
    if (pending?.signature !== signature) {
      const products = await api.catalog.productsByIds(snapshot.map(l => l.id));
      if (epoch !== sessionGeneration()) throw new ApiError(409, "Сессия изменилась", "SESSION_CHANGED");
      useCart.getState().refreshProducts(products);
      const byId = new Map(products.map(p => [p.id, p]));
      if (snapshot.some(line => !byId.get(line.id)?.inStock)) throw new ApiError(409, "Часть товаров недоступна. Удалите их из корзины перед заказом.", "CART_CHANGED");
      if (snapshot.some(line => byId.get(line.id)!.price.kopecks !== line.priceKopecks)) throw new ApiError(409, "Цены обновлены. Проверьте новую сумму и подтвердите заказ ещё раз.", "PRICE_CHANGED");
      pending = { signature, body: { ...contact, requestKey: uuid.v4(), expectedTotalKopecks: snapshot.reduce((sum, l) => sum + l.qty * l.priceKopecks, 0), items: snapshot.map(l => ({ id: l.id, qty: l.qty })) } };
    }
    const request = pending;
    try {
      const order = await api.orders.create(request.body);
      if (epoch !== sessionGeneration()) throw new ApiError(409, "Сессия изменилась", "SESSION_CHANGED");
      pending = undefined;
      return { order, items: request.body.items };
    } catch (error) {
      if (error instanceof ApiError && (error.code === "CART_CHANGED" || error.code === "PRICE_CHANGED")) {
        pending = undefined;
        const products = await api.catalog.productsByIds(snapshot.map(l => l.id));
        if (epoch === sessionGeneration()) useCart.getState().refreshProducts(products);
      }
      throw error;
    }
  };
  return async (contact: Contact, snapshot: readonly CartLine[]) => {
    if (inFlight) throw new ApiError(409, "Заказ уже отправляется. Дождитесь ответа.", "RETRY_REQUEST");
    inFlight = true;
    try { return await execute(contact, snapshot); }
    finally { inFlight = false; }
  };
}
