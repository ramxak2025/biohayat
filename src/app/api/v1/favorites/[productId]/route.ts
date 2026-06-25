import { apiOk, apiError, apiPreflight } from "@/lib/api/response";
import { requireApiCustomer, ApiAuthError } from "@/lib/api/token";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

/** POST /api/v1/favorites/[productId] — добавить товар в избранное. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    const session = await requireApiCustomer(req);
    const { productId } = await params;

    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) {
      return apiError("Товар не найден", 404, "NOT_FOUND");
    }

    await prisma.favorite.upsert({
      where: { customerId_productId: { customerId: session.sub, productId } },
      update: {},
      create: { customerId: session.sub, productId },
    });

    return apiOk({ ok: true });
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return apiError("Требуется авторизация", 401, "UNAUTHORIZED");
    }
    return apiError("Внутренняя ошибка", 500, "INTERNAL");
  }
}

/** DELETE /api/v1/favorites/[productId] — убрать товар из избранного. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    const session = await requireApiCustomer(req);
    const { productId } = await params;

    await prisma.favorite.deleteMany({
      where: { customerId: session.sub, productId },
    });

    return apiOk({ ok: true });
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return apiError("Требуется авторизация", 401, "UNAUTHORIZED");
    }
    return apiError("Внутренняя ошибка", 500, "INTERNAL");
  }
}
