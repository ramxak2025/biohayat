import { z } from "zod";
import { apiOk, apiError, apiPreflight } from "@/lib/api/response";
import { requireApiCustomer, ApiAuthError } from "@/lib/api/token";
import { prisma } from "@/lib/prisma";
import { serializeProduct } from "@/lib/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

/** GET /api/v1/favorites — избранные товары покупателя. */
export async function GET(req: Request) {
  try {
    const session = await requireApiCustomer(req);
    const favorites = await prisma.favorite.findMany({
      where: { customerId: session.sub },
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, category: true },
        },
      },
    });

    const products = favorites
      .map((f) => f.product)
      .filter((p): p is NonNullable<typeof p> => p != null && p.isActive);

    return apiOk(products.map(serializeProduct));
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return apiError("Требуется авторизация", 401, "UNAUTHORIZED");
    }
    return apiError("Внутренняя ошибка", 500, "INTERNAL");
  }
}

const putSchema = z.object({
  productIds: z.array(z.string()),
});

/** PUT /api/v1/favorites — заменить набор избранного (set-replace). */
export async function PUT(req: Request) {
  try {
    const session = await requireApiCustomer(req);
    const body = await req.json().catch(() => null);
    const parsed = putSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Проверьте данные", 400, "VALIDATION");
    }

    // только существующие товары
    const valid = await prisma.product.findMany({
      where: { id: { in: parsed.data.productIds } },
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
        ? [
            prisma.favorite.deleteMany({
              where: { customerId: session.sub, productId: { in: toRemove } },
            }),
          ]
        : []),
      ...toAdd.map((productId) =>
        prisma.favorite.create({ data: { customerId: session.sub, productId } }),
      ),
    ]);

    return apiOk({ ok: true });
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return apiError("Требуется авторизация", 401, "UNAUTHORIZED");
    }
    return apiError("Внутренняя ошибка", 500, "INTERNAL");
  }
}
