/**
 * Client-safe копия чистых функций оптового ценообразования из
 * src/lib/wholesale.ts (тот файл импортирует prisma и не может попасть в
 * клиентский бандл). Логика обязана совпадать 1:1 — сервер пересчитывает
 * цены этими же формулами в server action.
 */

export interface Tier {
  minQty: number;
  priceKopecks: number;
}

/** Позиция прайса, сериализованная сервером для клиентских компонентов. */
export interface PriceItem {
  id: string;
  name: string;
  volume: string | null;
  image: string | null;
  categoryId: string;
  categoryName: string;
  retailKopecks: number;
  tiers: Tier[];
}

/** Цена за штуку при количестве qty (retail — розничная цена как база). */
export function unitPriceForQty(retailKopecks: number, tiers: Tier[], qty: number): number {
  let price = retailKopecks;
  for (const t of [...tiers].sort((a, b) => a.minQty - b.minQty)) {
    if (qty >= t.minQty) price = t.priceKopecks;
  }
  return price;
}

/** Следующий порог лесенки (для «добавьте ещё X шт — цена станет Y»), или null. */
export function nextTier(tiers: Tier[], qty: number): Tier | null {
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  for (const t of sorted) if (qty < t.minQty) return t;
  return null;
}

/** Максимальная скидка лесенки против розницы, % (для бейджей «до −38%»). */
export function maxDiscountPercent(retailKopecks: number, tiers: Tier[]): number {
  if (!tiers.length || retailKopecks <= 0) return 0;
  const min = Math.min(...tiers.map((t) => t.priceKopecks));
  return Math.max(0, Math.round((1 - min / retailKopecks) * 100));
}

/** Скидка конкретной цены лесенки против розницы, % (для подсказок). */
export function discountAgainstRetail(retailKopecks: number, priceKopecks: number): number {
  if (retailKopecks <= 0) return 0;
  return Math.max(0, Math.round((1 - priceKopecks / retailKopecks) * 100));
}

/** «1 позиция», «2 позиции», «5 позиций». */
export function pluralPositions(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} позиция`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} позиции`;
  return `${n} позиций`;
}
