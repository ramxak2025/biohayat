import { cartCount, cartTotalKopecks, type CartLine } from "@/store/cart";

/**
 * Старая (зачёркнутая) цена позиции.
 *
 * Снимок товара в корзине (`CartLine`) хранит только текущую цену, поэтому
 * старую читаем мягко: появится поле в сторе — скидка в итогах посчитается
 * сама, а до тех пор строки «Скидка» просто нет. Придумывать зачёркнутую цену
 * нельзя: сумму заказа всё равно пересчитает сервер по каталогу.
 */
export function lineOldPriceKopecks(line: CartLine): number | null {
  const { oldPriceKopecks } = line as CartLine & { oldPriceKopecks?: unknown };
  if (typeof oldPriceKopecks !== "number" || !Number.isFinite(oldPriceKopecks)) return null;
  const old = Math.round(oldPriceKopecks);
  return old > line.priceKopecks ? old : null;
}

export interface CartTotals {
  /** Штук в корзине — сумма количеств, а не число строк. */
  count: number;
  /** «Товары (N)»: сумма по ценам БЕЗ скидки. */
  itemsKopecks: number;
  /** Сколько сэкономлено. 0 — строку «Скидка» показывать нечестно. */
  discountKopecks: number;
  /** Итого к оплате за товары (доставку считает менеджер). */
  totalKopecks: number;
}

/** Итоги корзины одной функцией — чтобы экран и панель считали одинаково. */
export function cartTotals(lines: CartLine[]): CartTotals {
  const totalKopecks = cartTotalKopecks(lines);
  const itemsKopecks = lines.reduce(
    (sum, line) => sum + (lineOldPriceKopecks(line) ?? line.priceKopecks) * line.qty,
    0,
  );

  return {
    count: cartCount(lines),
    itemsKopecks,
    discountKopecks: Math.max(0, itemsKopecks - totalKopecks),
    totalKopecks,
  };
}
