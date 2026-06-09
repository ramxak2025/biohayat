"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

/** Обновляет список в админке и страницу товара, на котором висит отзыв. */
async function revalidateReview(productId: string) {
  revalidatePath("/admin/reviews");
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { slug: true },
  });
  if (product) revalidatePath(`/product/${product.slug}`);
}

/** Одобрить отзыв — станет виден на странице товара. */
export async function approveReview(id: string): Promise<void> {
  await requireSession();
  const review = await prisma.productReview.update({
    where: { id },
    data: { isApproved: true },
  });
  await revalidateReview(review.productId);
}

/** Скрыть отзыв — вернётся в очередь модерации. */
export async function hideReview(id: string): Promise<void> {
  await requireSession();
  const review = await prisma.productReview.update({
    where: { id },
    data: { isApproved: false },
  });
  await revalidateReview(review.productId);
}

/** Удалить отзыв безвозвратно. */
export async function deleteReview(id: string): Promise<void> {
  await requireSession();
  const review = await prisma.productReview.delete({ where: { id } });
  await revalidateReview(review.productId);
}
