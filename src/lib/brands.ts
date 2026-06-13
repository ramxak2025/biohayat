import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

/**
 * Бренды: собственный ХАЯТ и сторонние известные марки.
 * Кэшируются по тегу "catalog" (сбрасывается при правках товаров/брендов
 * из админки), как и остальные витринные чтения.
 */

const getCachedActiveBrands = unstable_cache(
  () =>
    prisma.brand.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { products: { where: { isActive: true } } } } },
    }),
  ["brands-active"],
  { tags: ["catalog"], revalidate: 300 },
);

/** Активные бренды со счётчиком активных товаров (для фильтра и витрины). */
export const getActiveBrands = cache(async () => {
  try {
    return await getCachedActiveBrands();
  } catch {
    return [];
  }
});

const getCachedFeaturedBrands = unstable_cache(
  () =>
    prisma.brand.findMany({
      where: { isActive: true, isFeatured: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ["brands-featured"],
  { tags: ["catalog"], revalidate: 300 },
);

/** Бренды для витрины на главной/в каталоге. */
export const getFeaturedBrands = cache(async () => {
  try {
    return await getCachedFeaturedBrands();
  } catch {
    return [];
  }
});

const getCachedBrandBySlug = unstable_cache(
  (slug: string) => prisma.brand.findUnique({ where: { slug } }),
  ["brand-by-slug"],
  { tags: ["catalog"], revalidate: 300 },
);

export const getBrandBySlug = cache(async (slug: string) => getCachedBrandBySlug(slug));

export type BrandWithCount = Awaited<ReturnType<typeof getActiveBrands>>[number];
