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
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, category: true, brand: true },
  });
  const order = new Map(ids.map((id, i) => [id, i]));
  return products.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

/**
 * Id избранных товаров текущего покупателя (для гостей — пустой список).
 * Вызывается FavoritesProvider после монтирования, чтобы layout не ходил
 * в БД за избранным на каждом запросе. Персональные данные — не кэшируются.
 */
export async function getFavoriteIds(): Promise<string[]> {
  const session = await getCustomerSession();
  if (!session) return [];
  const rows = await prisma.favorite.findMany({
    where: { customerId: session.sub },
    select: { productId: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((f) => f.productId);
}

/**
 * Синхронизирует избранное авторизованного покупателя с БД.
 * Принимает полный набор productId; заменяет записи в БД на этот набор.
 * Возвращает подтверждённый сервером набор id (существующие товары) —
 * клиент использует его, чтобы вычистить «мёртвые» id из localStorage.
 * Для гостей — ничего не делает (избранное живёт в localStorage).
 */
export async function syncFavorites(productIds: string[]): Promise<string[] | null> {
  const session = await getCustomerSession();
  if (!session) return null;

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
    // createMany + skipDuplicates: параллельный запрос не уронит транзакцию
    // на unique-конфликте [customerId, productId]
    ...(toAdd.length
      ? [
          prisma.favorite.createMany({
            data: toAdd.map((productId) => ({ customerId: session.sub, productId })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ]);

  revalidatePath("/account/favorites");
  // Подтверждаем итоговый набор в исходном порядке клиента.
  return productIds.filter((id) => validIds.has(id));
}
