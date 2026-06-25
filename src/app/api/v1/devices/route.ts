import { z } from "zod";
import { apiOk, apiError, apiPreflight } from "@/lib/api/response";
import { requireApiCustomer, ApiAuthError } from "@/lib/api/token";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return apiPreflight();
}

const schema = z.object({
  platform: z.enum(["ios", "android"]),
  pushToken: z.string().min(1),
  appVersion: z.string().max(64).optional(),
});

/** POST /api/v1/devices — регистрация устройства для push-уведомлений. */
export async function POST(req: Request) {
  try {
    const session = await requireApiCustomer(req);
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Проверьте данные", 400, "VALIDATION");
    }

    const { platform, pushToken, appVersion } = parsed.data;
    await prisma.device.upsert({
      where: { customerId_pushToken: { customerId: session.sub, pushToken } },
      update: { platform, appVersion: appVersion ?? null, lastSeenAt: new Date() },
      create: { customerId: session.sub, platform, pushToken, appVersion: appVersion ?? null },
    });

    return apiOk({ ok: true });
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return apiError("Требуется авторизация", 401, "UNAUTHORIZED");
    }
    return apiError("Внутренняя ошибка", 500, "INTERNAL");
  }
}
