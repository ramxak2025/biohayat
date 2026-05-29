"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/customer-auth";
import type { ProductCardData } from "@/lib/queries";

/** Возвращает товары по списку id (для страницы избранного), сохраняя наличие. */
export async function getFavoriteProducts(ids: string[]): Promise<ProductCardData[]> {
  if (ids.length === 0) return [];
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, isActive: true },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, category: true },
  });
  const order = new Map(ids.map((id, i) => [id, i]));
  return products.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

/**
 * Синхронизирует избранное авторизованного покупателя с БД.
 * Принимает полный набор productId; заменяет записи в БД на этот набор.
 * Для гостей — ничего не делает (избранное живёт в localStorage).
 */
export async function syncFavorites(productIds: string[]): Promise<void> {
  const session = await getCustomerSession();
  if (!session) return;

  // только существующие товары
  const valid = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true },
  });
  const validIds = new Set(valid.map((p) => p.id));

  const existing = await prisma.favorite.findMany({
    where: { customerId: session.sub },
    select: { productId: true },
  });
  const existingIds = new Set(existing.map((f) => f.productId));

  const toAdd = [...validIds].filter((id) => !existingIds.has(id));
  const toRemove = [...existingIds].filter((id) => !validIds.has(id));

  await prisma.$transaction([
    ...(toRemove.length
      ? [prisma.favorite.deleteMany({ where: { customerId: session.sub, productId: { in: toRemove } } })]
      : []),
    ...toAdd.map((productId) =>
      prisma.favorite.create({ data: { customerId: session.sub, productId } }),
    ),
  ]);

  revalidatePath("/account/favorites");
}
