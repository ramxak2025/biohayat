import { useEffect, useState } from "react";

import { useCart } from "@/store/cart";

/**
 * Корзина лежит в AsyncStorage и поднимается асинхронно. Без этой проверки
 * на первом кадре `lines` пуст — и пользователь с полной корзиной успевает
 * увидеть «Корзина пуста». Пока не поднялась — показываем скелетон.
 */
export function useCartHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useCart.persist.hasHydrated());

  useEffect(() => {
    if (hydrated) return;
    return useCart.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

  return hydrated;
}
