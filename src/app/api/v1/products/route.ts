// GET /api/v1/products — каталог товаров с фильтрами, сортировкой и пагинацией.

import { type NextRequest } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { smartSearchProducts } from "@/lib/search";
import { apiOk, apiError, zodMessage, withErrorHandling } from "../_lib/response";
import { serializeProductCard } from "../_lib/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  category: z.string().max(200).optional(),
  audience: z.string().max(100).optional(),
  goal: z.string().max(100).optional(),
  q: z.string().max(100).optional(),
  sort: z.enum(["price_asc", "price_desc", "new", "popular"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(24),
});

const SORT_ORDER: Record<string, Prisma.ProductOrderByWithRelationInput[]> = {
  price_asc: [{ priceKopecks: "asc" }],
  price_desc: [{ priceKopecks: "desc" }],
  new: [{ createdAt: "desc" }],
  popular: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
};

export const GET = withErrorHandling(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const parsed = querySchema.safeParse({
    category: sp.get("category") ?? undefined,
    audience: sp.get("audience") ?? undefined,
    goal: sp.get("goal") ?? undefined,
    q: sp.get("q")?.slice(0, 100) ?? undefined,
    sort: sp.get("sort") ?? undefined,
    page: sp.get("page") ?? undefined,
    perPage: sp.get("perPage") ?? undefined,
  });
  if (!parsed.success) return apiError(400, "VALIDATION_ERROR", zodMessage(parsed.error));

  const { category, audience, goal, q, sort, page, perPage } = parsed.data;
  const skip = (page - 1) * perPage;

  // Полнотекстовый поиск (pg_trgm) с последующей фильтрацией по осям каталога:
  // сохраняем релевантность ранжирования, если сортировка не задана явно.
  if (q && q.trim().length >= 2) {
    const { items: found } = await smartSearchProducts(q, 300);
    let items = found.filter(
      (p) =>
        (!category || p.category.slug === category) &&
        (!audience || p.audiences.includes(audience)) &&
        (!goal || p.goals.includes(goal)),
    );
    if (sort === "price_asc") items = [...items].sort((a, b) => a.priceKopecks - b.priceKopecks);
    else if (sort === "price_desc") items = [...items].sort((a, b) => b.priceKopecks - a.priceKopecks);
    else if (sort === "new") items = [...items].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = items.length;
    const pageItems = items.slice(skip, skip + perPage);
    return apiOk(pageItems.map(serializeProductCard), { page, perPage, total });
  }

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...(category ? { category: { slug: category } } : {}),
    ...(audience ? { audiences: { has: audience } } : {}),
    ...(goal ? { goals: { has: goal } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      orderBy: SORT_ORDER[sort ?? "popular"],
      take: perPage,
      skip,
    }),
    prisma.product.count({ where }),
  ]);

  return apiOk(items.map(serializeProductCard), { page, perPage, total });
});
