// GET /api/v1/products/[slug] — полная карточка товара:
// описание, состав, применение, противопоказания, все изображения,
// похожие товары, одобренные отзывы и средний рейтинг.

import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProductBySlug, getRelatedProducts } from "@/lib/queries";
import { apiOk, apiError, withErrorHandling } from "../../_lib/response";
import { serializeProductCard } from "../../_lib/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withErrorHandling(
  async (_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) => {
    const { slug } = await ctx.params;

    const product = await getProductBySlug(slug);
    if (!product || !product.isActive) {
      return apiError(404, "NOT_FOUND", "Товар не найден");
    }

    const [related, reviews, ratingAgg] = await Promise.all([
      getRelatedProducts(product.categoryId, product.id, 8),
      prisma.productReview.findMany({
        where: { productId: product.id, isApproved: true },
        orderBy: { createdAt: "desc" },
        select: { authorName: true, rating: true, content: true, createdAt: true },
      }),
      prisma.productReview.aggregate({
        where: { productId: product.id, isApproved: true },
        _avg: { rating: true },
        _count: true,
      }),
    ]);

    return apiOk({
      id: product.id,
      slug: product.slug,
      name: product.name,
      shortDescription: product.shortDescription,
      description: product.description,
      composition: product.composition,
      usage: product.usage,
      contraindications: product.contraindications,
      volume: product.volume,
      sku: product.sku,
      priceKopecks: product.priceKopecks,
      oldPriceKopecks: product.oldPriceKopecks,
      badges: product.badges,
      audiences: product.audiences,
      goals: product.goals,
      nutrients: product.nutrients,
      inStock: product.inStock,
      category: {
        id: product.category.id,
        slug: product.category.slug,
        name: product.category.name,
      },
      images: product.images.map((img) => ({ url: img.url, alt: img.alt })),
      related: related.map(serializeProductCard),
      reviews: reviews.map((r) => ({
        authorName: r.authorName,
        rating: r.rating,
        content: r.content,
        createdAt: r.createdAt.toISOString(),
      })),
      rating: {
        average: ratingAgg._avg.rating ? Math.round(ratingAgg._avg.rating * 10) / 10 : null,
        count: ratingAgg._count,
      },
    });
  },
);
