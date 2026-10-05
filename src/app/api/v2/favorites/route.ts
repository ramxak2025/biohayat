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

/** GET /api/v2/favorites — избранные товары покупателя. */
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
  productIds: z.array(z.string().max(64)).max(100),
});

/** POST /api/v2/favorites — добавить гостевой набор, сохранив серверные изменения. */
export async function POST(req: Request) {
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

    await prisma.favorite.createMany({
      data: [...validIds].map(productId => ({ customerId: session.sub, productId })),
      skipDuplicates: true,
    });

    return apiOk({ ok: true });
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return apiError("Требуется авторизация", 401, "UNAUTHORIZED");
    }
    return apiError("Внутренняя ошибка", 500, "INTERNAL");
  }
}
