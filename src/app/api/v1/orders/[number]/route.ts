import { apiOk, apiError, apiPreflight } from "@/lib/api/response";
import { requireApiCustomer, ApiAuthError } from "@/lib/api/token";
import { prisma } from "@/lib/prisma";
import { serializeOrder } from "@/lib/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

/** GET /api/v1/orders/[number] — заказ покупателя по номеру. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ number: string }> },
) {
  try {
    const session = await requireApiCustomer(req);
    const { number } = await params;
    const orderNumber = Number(number);
    if (!Number.isInteger(orderNumber)) {
      return apiError("Заказ не найден", 404, "NOT_FOUND");
    }

    const order = await prisma.order.findUnique({
      where: { number: orderNumber },
      include: { items: true },
    });

    if (!order) {
      return apiError("Заказ не найден", 404, "NOT_FOUND");
    }
    if (order.customerId !== session.sub) {
      return apiError("Доступ запрещён", 403, "FORBIDDEN");
    }

    return apiOk(serializeOrder(order));
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return apiError("Требуется авторизация", 401, "UNAUTHORIZED");
    }
    return apiError("Внутренняя ошибка", 500, "INTERNAL");
  }
}
