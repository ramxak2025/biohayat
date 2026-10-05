import { apiOk, apiError, apiInternal, apiPreflight } from "@/lib/api/response";
import { getApiCustomer } from "@/lib/api/token";
import { prisma } from "@/lib/prisma";
import { serializeOrder } from "@/lib/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

/** GET /api/v2/orders/[number] — заказ покупателя по номеру. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ number: string }> },
) {
  try {
    const session = await getApiCustomer(req);
    if (!session) return apiError("Требуется авторизация", 401, "UNAUTHORIZED");

    const { number } = await params;
    const orderNumber = Number(number);
    if (!Number.isInteger(orderNumber)) {
      return apiError("Заказ не найден", 404, "NOT_FOUND");
    }

    // Чужой заказ — 404, а не 403: номера последовательные, и 403 подтверждал бы
    // существование заказа при простом переборе (GAP-N14).
    const order = await prisma.order.findFirst({
      where: { number: orderNumber, customerId: session.sub },
      include: { items: true },
    });

    if (!order) {
      return apiError("Заказ не найден", 404, "NOT_FOUND");
    }

    return apiOk(serializeOrder(order));
  } catch (e) {
    return apiInternal("api/v2/orders/[number] GET", e);
  }
}
