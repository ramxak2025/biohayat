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

export async function getProducts(opts: {
  categorySlug?: string;
  featured?: boolean;
  onSale?: boolean;
  take?: number;
  skip?: number;
  search?: string;
}) {
  const where = {
    isActive: true,
    ...(opts.categorySlug ? { category: { slug: opts.categorySlug } } : {}),
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
  return { items, total };
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

export function getRelatedProducts(categoryId: string, excludeId: string, take = 8) {
  return prisma.product.findMany({
    where: { categoryId, isActive: true, id: { not: excludeId } },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, category: true },
    take,
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
