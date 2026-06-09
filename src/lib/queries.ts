import { prisma } from "@/lib/prisma";

export function getNavCategories() {
  return prisma.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: { sortOrder: "asc" },
  });
}

export function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({ where: { slug } });
}

/* ─────────── Рейтинги товаров (одобренные отзывы) ─────────── */

export interface ReviewStats {
  avg: number; // средний рейтинг, округлён до 0.1
  count: number; // число одобренных отзывов
}

/**
 * Агрегация отзывов по списку товаров одним запросом (groupBy, без N+1).
 * Возвращает Map productId → { avg, count } только для товаров с отзывами.
 */
export async function getReviewStatsMap(productIds: string[]): Promise<Map<string, ReviewStats>> {
  if (productIds.length === 0) return new Map();
  const grouped = await prisma.productReview.groupBy({
    by: ["productId"],
    where: { productId: { in: productIds }, isApproved: true },
    _avg: { rating: true },
    _count: { _all: true },
  });
  return new Map(
    grouped.map((g) => [
      g.productId,
      { avg: Math.round((g._avg.rating ?? 0) * 10) / 10, count: g._count._all },
    ]),
  );
}

/** Дополняет товары полем reviewStats (avg/count по одобренным отзывам). */
async function withReviewStats<T extends { id: string }>(
  items: T[],
): Promise<(T & { reviewStats?: ReviewStats | null })[]> {
  const stats = await getReviewStatsMap(items.map((i) => i.id));
  return items.map((item) => ({ ...item, reviewStats: stats.get(item.id) ?? null }));
}

export async function getProducts(opts: {
  categorySlug?: string;
  audience?: string;
  goal?: string;
  featured?: boolean;
  onSale?: boolean;
  take?: number;
  skip?: number;
  search?: string;
}) {
  const where = {
    isActive: true,
    ...(opts.categorySlug ? { category: { slug: opts.categorySlug } } : {}),
    ...(opts.audience ? { audiences: { has: opts.audience } } : {}),
    ...(opts.goal ? { goals: { has: opts.goal } } : {}),
    ...(opts.featured ? { isFeatured: true } : {}),
    ...(opts.onSale ? { oldPriceKopecks: { not: null } } : {}),
    ...(opts.search
      ? { name: { contains: opts.search, mode: "insensitive" as const } }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, category: true },
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
      take: opts.take,
      skip: opts.skip,
    }),
    prisma.product.count({ where }),
  ]);
  return { items: await withReviewStats(items), total };
}

export function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      category: true,
    },
  });
}

export async function getRelatedProducts(categoryId: string, excludeId: string, take = 8) {
  const items = await prisma.product.findMany({
    where: { categoryId, isActive: true, id: { not: excludeId } },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, category: true },
    take,
  });
  return withReviewStats(items);
}

/** Одобренные отзывы товара (новые сверху). */
export function getApprovedReviews(productId: string) {
  return prisma.productReview.findMany({
    where: { productId, isApproved: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, authorName: true, rating: true, content: true, createdAt: true },
  });
}

export function getBanners(placement: "HERO" | "HOME_STRIP" | "CATEGORY" | "SIDEBAR" | "POPUP") {
  const now = new Date();
  return prisma.banner.findMany({
    where: {
      placement,
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: { sortOrder: "asc" },
  });
}

export function getPublishedMaterials(take?: number) {
  return prisma.material.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: "desc" },
    take,
  });
}

export function getMaterialBySlug(slug: string) {
  return prisma.material.findUnique({ where: { slug } });
}

export type ProductCardData = Awaited<ReturnType<typeof getProducts>>["items"][number];
