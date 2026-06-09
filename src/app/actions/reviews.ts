"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getCustomerSession } from "@/lib/customer-auth";

const reviewSchema = z.object({
  productId: z.string().min(1),
  authorName: z.string().trim().min(2, "Укажите имя").max(80, "Слишком длинное имя"),
  rating: z.coerce.number().int().min(1, "Поставьте оценку").max(5, "Оценка — от 1 до 5"),
  content: z.string().trim().max(2000, "Слишком длинный отзыв").optional().or(z.literal("")),
});

export type ReviewActionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * Создаёт отзыв о товаре. Отзыв публикуется только после модерации
 * (isApproved=false при создании). Лимит: 3 отзыва в час с одного IP.
 */
export async function submitReview(
  _prev: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const parsed = reviewSchema.safeParse({
    productId: formData.get("productId"),
    authorName: formData.get("authorName"),
    rating: formData.get("rating"),
    content: formData.get("content"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Проверьте заполнение формы", fieldErrors };
  }

  const { productId, authorName, rating, content } = parsed.data;

  // rate limit: 3 отзыва в час на IP
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  if (!rateLimit(`review:${ip}`, 3, 60 * 60 * 1000)) {
    return { ok: false, error: "Слишком много отзывов. Попробуйте позже." };
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, slug: true, isActive: true },
  });
  if (!product || !product.isActive) {
    return { ok: false, error: "Товар не найден" };
  }

  const session = await getCustomerSession();

  await prisma.productReview.create({
    data: {
      productId,
      customerId: session?.sub ?? null,
      authorName,
      rating,
      content: content || null,
      isApproved: false,
    },
  });

  revalidatePath(`/product/${product.slug}`);
  return { ok: true };
}
