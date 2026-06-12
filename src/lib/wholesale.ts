import { prisma } from "@/lib/prisma";

/**
 * Оптовое ценообразование: лесенка «от N шт — цена за шт».
 * Tiers отсортированы по minQty; розничная цена — базовая (qty < минимального порога).
 */

export interface Tier {
  minQty: number;
  priceKopecks: number;
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

/** Активные товары с лесенкой цен для оптового прайса. */
export async function getWholesaleProducts() {
  return prisma.product.findMany({
    where: { isActive: true, wholesaleTiers: { some: {} } },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      category: true,
      wholesaleTiers: { orderBy: { minQty: "asc" } },
    },
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
  });
}

export type WholesaleProduct = Awaited<ReturnType<typeof getWholesaleProducts>>[number];
