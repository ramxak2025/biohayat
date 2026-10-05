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

/** Snapshot includes identity so a delayed browser operation cannot affect a new login. */
export async function getFavoriteState() {
  const session = await getCustomerSession();
  if (!session) return { customerId: null, ids: [] as string[] };
  const rows = await prisma.favorite.findMany({ where: { customerId: session.sub }, select: { productId: true }, orderBy: { createdAt: "asc" } });
  return { customerId: session.sub, ids: rows.map(row => row.productId) };
}

export async function mergeGuestFavorites(customerId: string, productIds: string[]) {
  const session = await getCustomerSession();
  if (!session || session.sub !== customerId) throw new Error("Сессия изменилась. Обновите страницу.");
  if (productIds.length > 100) throw new Error("Слишком много товаров");
  const valid = await prisma.product.findMany({ where: { id: { in: productIds }, isActive: true }, select: { id: true } });
  await prisma.favorite.createMany({ data: valid.map(p => ({ customerId, productId: p.id })), skipDuplicates: true });
  revalidatePath("/account/favorites");
}

export async function setFavorite(customerId: string, productId: string, selected: boolean) {
  const session = await getCustomerSession();
  if (!session || session.sub !== customerId) throw new Error("Сессия изменилась. Обновите страницу.");
  if (selected) {
    const product = await prisma.product.findFirst({ where: { id: productId, isActive: true }, select: { id: true } });
    if (!product) throw new Error("Товар недоступен");
    await prisma.favorite.upsert({ where: { customerId_productId: { customerId, productId } }, create: { customerId, productId }, update: {} });
  } else {
    await prisma.favorite.deleteMany({ where: { customerId, productId } });
  }
  revalidatePath("/account/favorites");
}
