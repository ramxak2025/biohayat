import { useInfiniteQuery } from "@tanstack/react-query";

import { api } from "@/api/endpoints";
import { qk } from "@/api/keys";
import type { Order } from "@/api/types";
import { useAuth } from "@/store/auth";

export const ORDERS_PAGE_SIZE = 20;

/**
 * История заказов. GET /orders отдаёт ГОЛЫЙ массив без total — конец списка
 * определяем эвристикой «пришло меньше, чем просили».
 */
export function useOrders() {
  const token = useAuth((state) => state.token);

  return useInfiniteQuery({
    queryKey: qk.orders,
    enabled: !!token,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      api.orders.list({ take: ORDERS_PAGE_SIZE, skip: pageParam }, signal),
    getNextPageParam: (lastPage: Order[], allPages: Order[][]) =>
      lastPage.length < ORDERS_PAGE_SIZE
        ? undefined
        : allPages.reduce((count, page) => count + page.length, 0),
    select: (data) => ({ ...data, items: data.pages.flat() }),
  });
}

/**
 * Подпись для счётчика в кабинете: пока есть следующая страница, точного числа
 * мы не знаем — показываем «20+», а не врём точным значением.
 */
export function ordersCountLabel(count: number, hasNextPage: boolean): string {
  return hasNextPage ? `${count}+` : String(count);
}
