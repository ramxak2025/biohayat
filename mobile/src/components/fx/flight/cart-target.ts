import { TAB_BAR_HEIGHT } from "@/components/ui";

/**
 * Корзина — 4-я вкладка из 5: Главная · Каталог · Приём · Корзина · Кабинет
 * (см. src/app/(tabs)/_layout.tsx).
 */
export const CART_TAB_INDEX = 4;
export const TAB_COUNT = 5;

export interface FlightTarget {
  x: number;
  y: number;
}

/**
 * Куда целится полёт.
 *
 * Таб-бар нативный (настоящий UITabBar под NativeTabs), и координаты его иконок
 * в JS не приходят — а тащить нативный модуль ради одной анимации нечестно.
 * Поэтому считаем геометрически: UITabBar делит ширину на равные ячейки, центр
 * i-й ячейки = width · (i − 0.5) / N. По вертикали целимся в середину бара:
 * низ экрана минус safe area — это его верхняя граница.
 *
 * Точность ±10 pt, и её достаточно: к моменту прилёта копия уже уменьшена до
 * 0.22 и прозрачна, поэтому глаз считывает направление, а не пиксель.
 */
export function cartTarget(width: number, height: number, bottomInset: number): FlightTarget {
  return {
    x: (width * (CART_TAB_INDEX - 0.5)) / TAB_COUNT,
    y: height - bottomInset - TAB_BAR_HEIGHT / 2,
  };
}
