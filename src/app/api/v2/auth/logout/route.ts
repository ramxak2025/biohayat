import { z } from "zod";
import { apiOk, apiError, apiPreflight, apiInternal } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { getActiveCustomer } from "../_lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

const schema = z.object({
  /** Токен конкретного устройства; без него отвязываются все устройства. */
  pushToken: z.string().min(1).optional(),
});

/**
 * POST /api/v2/auth/logout — выход.
 *
 * ЧЕСТНОЕ ОГРАНИЧЕНИЕ: сам JWT здесь не отзывается — отзывать его нечем,
 * модели RefreshToken в схеме нет, токен живёт свои 30 дней. Что роут делает
 * на самом деле — снимает пуш-токены устройства, чтобы на потерянный телефон
 * перестали приходить уведомления. Клиент ОБЯЗАН вдобавок стереть токен из
 * expo-secure-store; полноценный отзыв (B4) требует миграции схемы.
 */
export async function POST(req: Request) {
  try {
    const customer = await getActiveCustomer(req);
    if (!customer) return apiError("Требуется авторизация", 401, "UNAUTHORIZED");

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body ?? {});
    if (!parsed.success) {
      return apiError("Проверьте данные", 400, "VALIDATION");
    }

    // Только свои устройства: customerId в where — не оптимизация, а защита.
    const { count } = await prisma.device.deleteMany({
      where: {
        customerId: customer.id,
        ...(parsed.data.pushToken ? { pushToken: parsed.data.pushToken } : {}),
      },
    });

    return apiOk({ ok: true, revokedDevices: count });
  } catch (e) {
    return apiInternal("api/v2/auth/logout", e);
  }
}
