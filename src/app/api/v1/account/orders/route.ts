// GET /api/v1/account/orders — заказы покупателя с позициями и статусами (Bearer).

import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiOk, apiError, withErrorHandling } from "../../_lib/response";
import { requireActiveCustomer } from "../../_lib/auth";
import { serializeOrder } from "../../_lib/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const customer = await requireActiveCustomer(req);
  if (!customer) return apiError(401, "UNAUTHORIZED", "Требуется авторизация");

  const orders = await prisma.order.findMany({
    where: { customerId: customer.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return apiOk(orders.map(serializeOrder), { total: orders.length });
});
